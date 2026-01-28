/**
 * Vault File Manager - handles reading and writing markdown files to Obsidian vault
 * New structure: All contacts in /40 People/ folder (flat), communities stored in YAML
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import type { TendContact } from '../models/tend-contact';
import { TemplateEngine } from '../templates/template-engine';
import { MarkdownParser } from './markdown-parser';
import { MarkdownMerger } from './markdown-merger';
import { generateFilename } from '../utils/file-naming';

export interface FileManagerConfig {
  vaultPath: string;
}

export interface WriteResult {
  filepath: string;
  filename: string;
  created: boolean;
  merged: boolean;
  preservedSections?: string[];
  preservedDateEntries?: number;
  updatedSections?: string[];
}

interface ClayIdCache {
  [clayId: number]: string; // clayId → filepath
}

export class VaultFileManager {
  private vaultPath: string;
  private contactsFolder: string; // Path to /40 People/ folder
  private templateEngine: TemplateEngine;
  private parser: MarkdownParser;
  private merger: MarkdownMerger;
  private clayIdCache: ClayIdCache = {};
  private cacheFilePath: string;

  constructor(config: FileManagerConfig) {
    this.vaultPath = config.vaultPath;
    this.contactsFolder = this.vaultPath;
    this.cacheFilePath = path.join(this.vaultPath, '.clayid-cache.json');
    this.templateEngine = new TemplateEngine();
    this.parser = new MarkdownParser();
    this.merger = new MarkdownMerger();

    // Load clayId cache (prevents O(n²) file lookups)
    this.clayIdCache = this.loadCache();

    // Validate vault path
    if (!fs.pathExistsSync(this.vaultPath)) {
      throw new Error(`Vault path does not exist: ${this.vaultPath}`);
    }
  }

  /**
   * Load clayId cache from disk (.clayid-cache.json)
   * Returns empty object if cache doesn't exist
   */
  private loadCache(): ClayIdCache {
    try {
      if (fs.pathExistsSync(this.cacheFilePath)) {
        const content = fs.readFileSync(this.cacheFilePath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      // Ignore cache errors - it's non-critical and can be rebuilt
      console.warn('[Cache] Error loading clayId cache, will rebuild:', error instanceof Error ? error.message : String(error));
    }
    return {};
  }

  /**
   * Save clayId cache to disk
   */
  private async saveCache(): Promise<void> {
    try {
      await fs.writeFile(this.cacheFilePath, JSON.stringify(this.clayIdCache, null, 2), 'utf-8');
    } catch (error) {
      // Non-critical failure - log but don't throw
      console.warn('[Cache] Error saving clayId cache:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Add entry to clayId cache
   */
  private async updateCache(clayId: number, filepath: string): Promise<void> {
    this.clayIdCache[clayId] = filepath;
    await this.saveCache();
  }

  /**
   * Write a contact to a markdown file in the vault
   * Implements intelligent merge: re-sync with fresh Clay data while preserving user notes and external properties
   *
   * Algorithm:
   * 1. Detect if file exists (by clayId search)
   * 2. If exists, parse and intelligently merge with fresh data
   * 3. Write merged (or new) content to /40 People/{ContactName}.md
   * 4. Return result with merge metadata
   */
  async writeContact(contact: TendContact): Promise<WriteResult> {
    // Generate base filename
    const baseFilename = generateFilename(contact.name);

    // All files go to /40 People/ folder
    const targetPath = path.join(this.contactsFolder, baseFilename);

    // Search for existing file by clayId
    const existingPath = await this.findExistingFile(contact);

    // Generate fresh markdown from Clay data
    const freshMarkdown = this.templateEngine.generateMarkdown(contact);

    // Case 1: No existing file - create new
    if (!existingPath) {
      // Ensure /40 People/ directory exists
      await fs.ensureDir(this.contactsFolder);

      // Write fresh markdown
      await fs.writeFile(targetPath, freshMarkdown, 'utf-8');

      // Cache the new clayId → filepath mapping
      await this.updateCache(contact.clayId, targetPath);

      return {
        filepath: targetPath,
        filename: baseFilename,
        created: true,
        merged: false
      };
    }

    // Case 2: Existing file found - intelligent merge
    try {
      // Read existing markdown
      const existingMarkdown = await fs.readFile(existingPath, 'utf-8');

      // Parse both existing and fresh markdown
      const existingParsed = this.parser.parse(existingMarkdown);
      const freshParsed = this.parser.parse(freshMarkdown);

      // Merge: fresh system sections + preserved user sections + preserved date entries + preserve all YAML properties
      const mergeResult = this.merger.merge(existingParsed, freshParsed);

      // Write merged content
      await fs.writeFile(targetPath, mergeResult.markdown, 'utf-8');

      // Update cache if path changed (shouldn't happen now since all in same folder)
      if (targetPath !== existingPath) {
        delete this.clayIdCache[contact.clayId];
        await fs.remove(existingPath);
        await this.updateCache(contact.clayId, targetPath);
      }

      return {
        filepath: targetPath,
        filename: baseFilename,
        created: false,
        merged: true,
        preservedSections: mergeResult.preservedSections,
        preservedDateEntries: mergeResult.preservedDateEntries,
        updatedSections: mergeResult.updatedSections
      };
    } catch (error) {
      // If merge fails (malformed file, parsing error), create backup and write fresh
      const backupPath = `${existingPath}.backup-${Date.now()}`;
      await fs.copy(existingPath, backupPath);
      await fs.remove(existingPath);

      // Ensure /40 People/ directory exists
      await fs.ensureDir(this.contactsFolder);

      // Write fresh markdown (no merge)
      await fs.writeFile(targetPath, freshMarkdown, 'utf-8');

      // Update cache
      await this.updateCache(contact.clayId, targetPath);

      return {
        filepath: targetPath,
        filename: baseFilename,
        created: false,
        merged: false,
        preservedSections: [] // Nothing preserved due to error
      };
    }
  }

  /**
   * Find existing file - PRIMARY: by clayId
   *
   * Uses clayId as primary identifier (most reliable):
   * - Handles name changes in Clay/LinkedIn
   * - Works with CSV batch imports (matched by ID)
   * - Prevents duplicate files when contact is renamed
   */
  private async findExistingFile(contact: TendContact): Promise<string | null> {
    // Search by clayId in frontmatter (source of truth)
    // This is the most reliable method - contact name can change, but ID doesn't
    const fileByClayId = await this.findFileByClayId(contact.clayId);
    if (fileByClayId) {
      return fileByClayId;
    }

    // FALLBACK: Search by name in /40 People/ folder
    // Handles contacts created before clayId implementation
    const baseFilename = generateFilename(contact.name);
    const fallbackPath = path.join(this.contactsFolder, baseFilename);
    if (await fs.pathExists(fallbackPath)) {
      return fallbackPath;
    }

    return null;
  }

  /**
   * Search vault for file with matching clayId in frontmatter
   * PRIMARY method for finding existing contacts
   *
   * Algorithm:
   * 1. Check cache first (O(1) lookup) - fast path
   * 2. Cache miss → use grep to search for clayId pattern
   * 3. Found → update cache for future lookups
   * 4. Not found → return null
   */
  private async findFileByClayId(clayId: number): Promise<string | null> {
    // 1. Check cache first (fast path - O(1))
    const cachedPath = this.clayIdCache[clayId];
    if (cachedPath) {
      // Verify cached path still exists
      if (await fs.pathExists(cachedPath)) {
        return cachedPath;
      }
      // Remove stale cache entry if file was deleted
      delete this.clayIdCache[clayId];
      await this.saveCache();
    }

    // 2. Cache miss - use grep to search for clayId (much faster than parsing every file)
    const filePath = await this.findFileByGrepClayId(clayId);

    if (filePath) {
      // 3. Found match - update cache for future lookups
      await this.updateCache(clayId, filePath);
      return filePath;
    }

    return null;
  }

  /**
   * Use grep to search for clayId in markdown files
   * Much faster than reading + parsing every file
   */
  private async findFileByGrepClayId(clayId: number): Promise<string | null> {
    try {
      const { execSync } = await import('child_process');

      // Search for pattern: "clayId: 45241459" (YAML format)
      const pattern = `clayId: ${clayId}`;

      // Use grep to find files with this pattern in /40 People/ folder
      // -r: recursive, -l: list filenames only, --include: only .md files
      const result = execSync(
        `grep -r "${pattern}" "${this.contactsFolder}" --include="*.md" -l`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
      ).trim();

      if (!result) {
        return null;
      }

      // Return first match (should be only one match, but take first if multiple)
      const files = result.split('\n').filter(f => f.length > 0);
      return files[0] || null;
    } catch (error) {
      // grep returns exit code 1 if no matches found (normal condition)
      // Only log actual errors
      if (error instanceof Error && !error.message.includes('exit code 1')) {
        console.warn(`[Grep] Error searching for clayId ${clayId}:`, error.message);
      }
      return null;
    }
  }

  /**
   * Read a markdown file from the vault
   */
  async readFile(filepath: string): Promise<string> {
    if (!fs.pathExistsSync(filepath)) {
      throw new Error(`File not found: ${filepath}`);
    }

    return await fs.readFile(filepath, 'utf-8');
  }

  /**
   * Check if a file exists in the vault
   */
  async fileExists(filename: string): Promise<boolean> {
    const filepath = path.join(this.contactsFolder, filename);
    return fs.pathExists(filepath);
  }

  /**
   * Get vault path (useful for logging/debugging)
   */
  getVaultPath(): string {
    return this.vaultPath;
  }

  /**
   * Get full filepath for a filename in the vault
   */
  getFilepath(filename: string): string {
    return path.join(this.contactsFolder, filename);
  }
}
