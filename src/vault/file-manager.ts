/**
 * Vault File Manager - handles reading and writing markdown files to Obsidian vault
 * New structure: All contacts in /40 People/ folder (flat), communities stored in YAML
 *
 * Performance optimizations (2026-01-28):
 * - Batch cache writes: call flushCache() at end of sync instead of per-contact
 * - Skip unchanged: compares content before writing to avoid unnecessary I/O
 * - Async rg: non-blocking file search for clayId lookups
 * - Optional zReview backup: --skip-review flag to disable backup creation
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import type { TendContact } from '../models/tend-contact';
import { TemplateEngine } from '../templates/template-engine';
import { MarkdownParser } from './markdown-parser';
import { MarkdownMerger } from './markdown-merger';
import { generateFilename } from '../utils/file-naming';

const execFileAsync = promisify(execFile);

export interface FileManagerConfig {
  vaultPath: string;
  skipReview?: boolean; // If true, don't create zReview backups on merge
  useCache?: boolean; // If false, always search live and never write cache entries
}

export interface WriteResult {
  filepath: string;
  filename: string;
  created: boolean;
  merged: boolean;
  skipped?: boolean; // True if content unchanged
  matchMethod?: 'clayId' | 'name' | 'none';
  suggestedFilename?: string;
  preservedSections?: string[];
  preservedDateEntries?: number;
  updatedSections?: string[];
}

export interface ContactPlan {
  action: 'create' | 'merge' | 'adopt-legacy' | 'suggest-rename';
  filepath: string;
  filename: string;
  matchMethod: 'clayId' | 'name' | 'none';
  suggestedFilename?: string;
  duplicatePaths?: string[];
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
  private cacheModified: boolean = false; // Track if cache needs saving
  private skipReview: boolean;
  private useCache: boolean;

  constructor(config: FileManagerConfig) {
    this.vaultPath = config.vaultPath;
    this.contactsFolder = this.vaultPath;
    this.cacheFilePath = path.join(this.vaultPath, '.clayid-cache.json');
    this.skipReview = config.skipReview || false;
    this.useCache = config.useCache !== false;
    this.templateEngine = new TemplateEngine();
    this.parser = new MarkdownParser();
    this.merger = new MarkdownMerger();

    // Load clayId cache (prevents O(n²) file lookups)
    this.clayIdCache = this.useCache ? this.loadCache() : {};

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
   * Save clayId cache to disk (only if modified)
   * Call this at the END of a sync batch for best performance
   */
  async flushCache(): Promise<void> {
    if (!this.cacheModified) {
      return; // No changes to save
    }

    try {
      await fs.writeFile(this.cacheFilePath, JSON.stringify(this.clayIdCache, null, 2), 'utf-8');
      this.cacheModified = false;
    } catch (error) {
      // Non-critical failure - log but don't throw
      console.warn('[Cache] Error saving clayId cache:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Add entry to clayId cache (marks cache as modified, doesn't save immediately)
   * Call flushCache() at end of batch to persist
   */
  private updateCache(clayId: number, filepath: string): void {
    if (!this.useCache) {
      return;
    }
    this.clayIdCache[clayId] = filepath;
    this.cacheModified = true;
  }

  /**
   * Remove entry from clayId cache
   */
  private removeFromCache(clayId: number): void {
    if (!this.useCache) {
      return;
    }
    if (this.clayIdCache[clayId]) {
      delete this.clayIdCache[clayId];
      this.cacheModified = true;
    }
  }

  /**
   * Generate timestamp suffix for backup files: YYYYMMDD-HHMM
   */
  private generateTimestamp(): string {
    const now = new Date();
    return now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      '-' +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0');
  }

  /**
   * Write a contact to a markdown file in the vault
   * Implements intelligent merge: re-sync with fresh Clay data while preserving user notes and external properties
   *
   * Algorithm:
   * 1. Detect if file exists (by clayId, then name fallback for legacy notes)
   * 2. If exists, parse and intelligently merge with fresh data
   * 3. Skip write if content unchanged (optimization for re-syncs)
   * 4. Optionally backup old version to zReview (unless skipReview=true)
   * 5. Write merged (or new) content to /40 People/{ContactName}.md
   * 6. Return result with merge metadata
   */
  async writeContact(contact: TendContact): Promise<WriteResult> {
    // Generate base filename
    const baseFilename = generateFilename(contact.name);

    // All files go to /40 People/ folder
    const targetPath = path.join(this.contactsFolder, baseFilename);

    // Search for existing file by clayId first, then name fallback
    const existingMatch = await this.findExistingFile(contact);
    const existingPath = existingMatch?.filepath || null;

    // Generate fresh markdown from Clay data
    const freshMarkdown = this.templateEngine.generateMarkdown(contact);

    // Case 1: No existing file - create new
    if (!existingPath) {
      // Ensure /40 People/ directory exists
      await fs.ensureDir(this.contactsFolder);

      // Write fresh markdown
      await fs.writeFile(targetPath, freshMarkdown, 'utf-8');

      // Cache the new clayId → filepath mapping (batched save)
      this.updateCache(contact.clayId, targetPath);

      return {
        filepath: targetPath,
        filename: baseFilename,
        created: true,
        merged: false,
        matchMethod: 'none'
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

      // Skip write if content unchanged (optimization for bulk re-syncs)
      if (mergeResult.markdown.trim() === existingMarkdown.trim()) {
        this.updateCache(contact.clayId, existingPath);

        return {
          filepath: existingPath,
          filename: path.basename(existingPath),
          created: false,
          merged: false,
          skipped: true,
          matchMethod: existingMatch?.method,
          suggestedFilename: this.getSuggestedFilename(existingPath, baseFilename),
          preservedSections: mergeResult.preservedSections,
          preservedDateEntries: mergeResult.preservedDateEntries
        };
      }

      // Backup to zReview (unless skipReview is true)
      if (!this.skipReview) {
        const reviewFolder = path.join(this.vaultPath, '..', 'zReview');
        await fs.ensureDir(reviewFolder);

        const timestamp = this.generateTimestamp();
        const oldFileName = path.basename(existingPath).replace('.md', `-${timestamp}.md`);
        const reviewPath = path.join(reviewFolder, oldFileName);

        // Copy existing file to zReview. The active note remains in place so
        // Obsidian links are not silently renamed or moved.
        await fs.copy(existingPath, reviewPath, { overwrite: true });
      }

      // Write merged content in place. If the display name changed, report a
      // suggested rename instead of breaking existing Obsidian wikilinks.
      await fs.writeFile(existingPath, mergeResult.markdown, 'utf-8');

      this.updateCache(contact.clayId, existingPath);

      return {
        filepath: existingPath,
        filename: path.basename(existingPath),
        created: false,
        merged: true,
        matchMethod: existingMatch?.method,
        suggestedFilename: this.getSuggestedFilename(existingPath, baseFilename),
        preservedSections: mergeResult.preservedSections,
        preservedDateEntries: mergeResult.preservedDateEntries,
        updatedSections: mergeResult.updatedSections
      };
    } catch (error) {
      // If merge fails (malformed file, parsing error), backup to zReview with ERROR suffix and write fresh
      const reviewFolder = path.join(this.vaultPath, '..', 'zReview');
      await fs.ensureDir(reviewFolder);

      const timestamp = this.generateTimestamp();
      const backupFileName = baseFilename.replace('.md', `-${timestamp}-ERROR.md`);
      const backupPath = path.join(reviewFolder, backupFileName);

      // Log the actual error for debugging
      console.warn(`[Merge] Error merging ${baseFilename}:`, error instanceof Error ? error.message : String(error));

      await fs.copy(existingPath, backupPath, { overwrite: true });

      // Write fresh markdown in place (no merge), preserving Obsidian link target
      await fs.writeFile(existingPath, freshMarkdown, 'utf-8');

      // Update cache
      this.updateCache(contact.clayId, existingPath);

      return {
        filepath: existingPath,
        filename: path.basename(existingPath),
        created: false,
        merged: false,
        matchMethod: existingMatch?.method,
        suggestedFilename: this.getSuggestedFilename(existingPath, baseFilename),
        preservedSections: [] // Nothing preserved due to error
      };
    }
  }

  /**
   * Plan a contact write without touching the filesystem.
   */
  async planContact(contact: TendContact): Promise<ContactPlan> {
    const baseFilename = generateFilename(contact.name);
    const targetPath = path.join(this.contactsFolder, baseFilename);
    const existingMatch = await this.findExistingFile(contact);

    if (!existingMatch) {
      return {
        action: 'create',
        filepath: targetPath,
        filename: baseFilename,
        matchMethod: 'none'
      };
    }

    const suggestedFilename = this.getSuggestedFilename(existingMatch.filepath, baseFilename);
    return {
      action: existingMatch.method === 'name'
        ? 'adopt-legacy'
        : suggestedFilename
          ? 'suggest-rename'
          : 'merge',
      filepath: existingMatch.filepath,
      filename: path.basename(existingMatch.filepath),
      matchMethod: existingMatch.method,
      suggestedFilename
    };
  }

  /**
   * Find existing file - PRIMARY: by clayId
   *
   * Uses the stable Clay/Mesh ID as the identity key:
   * - Handles contact name changes without duplicate files
   * - Prevents wrong-note merges when names collide
   * - Falls back to name only for legacy notes that do not have clayId yet
   */
  private async findExistingFile(contact: TendContact): Promise<{ filepath: string; method: 'clayId' | 'name' } | null> {
    // PRIMARY: Search by clayId in frontmatter
    const fileByClayId = await this.findFileByClayId(contact.clayId);
    if (fileByClayId) {
      return { filepath: fileByClayId, method: 'clayId' };
    }

    // FALLBACK: Search by name anywhere under the vault for legacy notes
    const baseFilename = generateFilename(contact.name);
    const fileByName = await this.findFileByName(baseFilename);
    if (fileByName) {
      return { filepath: fileByName, method: 'name' };
    }

    return null;
  }

  /**
   * Search vault for file with matching clayId in frontmatter
   *
   * Algorithm:
   * 1. Check cache first (O(1) lookup) - fast path
   * 2. Cache miss → use async rg to search for clayId pattern
   * 3. Found → update cache for future lookups
   * 4. Not found → return null
   */
  private async findFileByClayId(clayId: number): Promise<string | null> {
    // 1. Check cache first (fast path - O(1))
    const cachedPath = this.useCache ? this.clayIdCache[clayId] : undefined;
    if (cachedPath) {
      // Verify cached path still exists
      if (await fs.pathExists(cachedPath)) {
        return cachedPath;
      }
      // Remove stale cache entry if file was deleted
      this.removeFromCache(clayId);
    }

    // 2. Cache miss - use async rg to search for clayId (non-blocking)
    const filePath = await this.findFileBySearchClayId(clayId);

    if (filePath) {
      // 3. Found match - update cache for future lookups
      this.updateCache(clayId, filePath);
      return filePath;
    }

    return null;
  }

  /**
   * Use async rg to search for clayId in markdown files
   * Much faster than reading + parsing every file, and non-blocking
   */
  private async findFileBySearchClayId(clayId: number): Promise<string | null> {
    const patterns = [
      `clayId: ${clayId}`,
      `clayid: ${clayId}`
    ];
    const files = new Set<string>();

    for (const pattern of patterns) {
      for (const file of await this.searchFilesByFixedString(pattern)) {
        files.add(file);
      }
    }

    if (files.size === 0) {
      return null;
    }

    if (files.size > 1) {
      throw new Error(`Duplicate clayId ${clayId} found in multiple notes: ${Array.from(files).join(', ')}`);
    }
    return Array.from(files)[0] || null;
  }

  /**
   * Search for an exact markdown filename anywhere under the vault.
   */
  private async findFileByName(filename: string): Promise<string | null> {
    const files = await this.findFilesByName(filename);

    if (files.length === 0) {
      return null;
    }

    if (files.length > 1) {
      throw new Error(`Multiple legacy notes named ${filename}: ${files.join(', ')}`);
    }

    return files[0] || null;
  }

  private async findFilesByName(filename: string): Promise<string[]> {
    try {
      const { stdout } = await execFileAsync(
        'rg',
        [
          '--files',
          '--glob',
          filename,
          '--no-ignore',
          '--no-messages',
          this.contactsFolder
        ],
        { encoding: 'utf-8' }
      );

      return this.parseSearchOutput(stdout);
    } catch (error: any) {
      // rg returns exit code 1 if no matches found (normal condition)
      if (error.code !== 1) {
        console.warn(`[Search] Error searching for ${filename}:`, error.message);
      }
      return [];
    }
  }

  private async searchFilesByFixedString(pattern: string): Promise<string[]> {
    try {
      const { stdout } = await execFileAsync(
        'rg',
        [
          '--fixed-strings',
          '--files-with-matches',
          '--glob',
          '*.md',
          '--no-ignore',
          '--no-messages',
          pattern,
          this.contactsFolder
        ],
        { encoding: 'utf-8' }
      );

      return this.parseSearchOutput(stdout);
    } catch (error: any) {
      if (error.stdout) {
        return this.parseSearchOutput(error.stdout);
      }

      // rg returns exit code 1 when no matches are found. Exit code 2 can be
      // caused by broken cloud-file placeholders; --no-messages keeps that quiet.
      if (error.code !== 1 && error.code !== 2) {
        console.warn(`[Search] Error searching for ${pattern}:`, error.message);
      }
      return [];
    }
  }

  private parseSearchOutput(stdout: string): string[] {
    return stdout
      .trim()
      .split('\n')
      .map(f => f.trim())
      .filter(f => f.length > 0);
  }

  /**
   * Read a markdown file from the vault
   */
  async readFile(filepath: string): Promise<string> {
    if (!(await fs.pathExists(filepath))) {
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

  private getSuggestedFilename(existingPath: string, desiredFilename: string): string | undefined {
    const currentFilename = path.basename(existingPath);
    return currentFilename === desiredFilename ? undefined : desiredFilename;
  }
}
