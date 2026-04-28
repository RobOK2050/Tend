/**
 * Vault File Manager - handles reading and writing markdown files to Obsidian vault
 * New structure: All contacts in /40 People/ folder (flat), communities stored in YAML
 *
 * Performance optimizations (2026-01-28):
 * - Batch cache writes: call flushCache() at end of sync instead of per-contact
 * - Skip unchanged: compares content before writing to avoid unnecessary I/O
 * - Async grep: non-blocking file search for clayId lookups
 * - Optional zReview backup: --skip-review flag to disable backup creation
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { TendContact } from '../models/tend-contact';
import { TemplateEngine } from '../templates/template-engine';
import { MarkdownParser } from './markdown-parser';
import { MarkdownMerger } from './markdown-merger';
import { generateFilename } from '../utils/file-naming';

const execAsync = promisify(exec);

export interface FileManagerConfig {
  vaultPath: string;
  skipReview?: boolean; // If true, don't create zReview backups on merge
}

export interface WriteResult {
  filepath: string;
  filename: string;
  created: boolean;
  merged: boolean;
  skipped?: boolean; // True if content unchanged
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
  private cacheModified: boolean = false; // Track if cache needs saving
  private skipReview: boolean;

  constructor(config: FileManagerConfig) {
    this.vaultPath = config.vaultPath;
    this.contactsFolder = this.vaultPath;
    this.cacheFilePath = path.join(this.vaultPath, '.clayid-cache.json');
    this.skipReview = config.skipReview || false;
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
    this.clayIdCache[clayId] = filepath;
    this.cacheModified = true;
  }

  /**
   * Remove entry from clayId cache
   */
  private removeFromCache(clayId: number): void {
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
   * 1. Detect if file exists (by name, then clayId search)
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

    // Search for existing file by name, then clayId
    const existingPath = await this.findExistingFile(contact);

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

      // Skip write if content unchanged (optimization for bulk re-syncs)
      if (mergeResult.markdown.trim() === existingMarkdown.trim()) {
        // Update cache path if needed (file might have been found by clayId with different name)
        if (targetPath !== existingPath) {
          this.removeFromCache(contact.clayId);
          this.updateCache(contact.clayId, targetPath);
        }

        return {
          filepath: existingPath,
          filename: path.basename(existingPath),
          created: false,
          merged: false,
          skipped: true,
          preservedSections: mergeResult.preservedSections,
          preservedDateEntries: mergeResult.preservedDateEntries
        };
      }

      // Backup to zReview (unless skipReview is true)
      if (!this.skipReview && targetPath === existingPath) {
        const reviewFolder = path.join(this.vaultPath, '..', 'zReview');
        await fs.ensureDir(reviewFolder);

        const timestamp = this.generateTimestamp();
        const oldFileName = baseFilename.replace('.md', `-${timestamp}.md`);
        const reviewPath = path.join(reviewFolder, oldFileName);

        // Move existing file to zReview
        await fs.move(existingPath, reviewPath, { overwrite: true });
      }

      // Write merged content to target location
      await fs.writeFile(targetPath, mergeResult.markdown, 'utf-8');

      // Update cache if path changed
      if (targetPath !== existingPath) {
        this.removeFromCache(contact.clayId);
        this.updateCache(contact.clayId, targetPath);
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
      // If merge fails (malformed file, parsing error), backup to zReview with ERROR suffix and write fresh
      const reviewFolder = path.join(this.vaultPath, '..', 'zReview');
      await fs.ensureDir(reviewFolder);

      const timestamp = this.generateTimestamp();
      const backupFileName = baseFilename.replace('.md', `-${timestamp}-ERROR.md`);
      const backupPath = path.join(reviewFolder, backupFileName);

      // Log the actual error for debugging
      console.warn(`[Merge] Error merging ${baseFilename}:`, error instanceof Error ? error.message : String(error));

      await fs.move(existingPath, backupPath, { overwrite: true });

      // Ensure /40 People/ directory exists
      await fs.ensureDir(this.contactsFolder);

      // Write fresh markdown (no merge)
      await fs.writeFile(targetPath, freshMarkdown, 'utf-8');

      // Update cache
      this.updateCache(contact.clayId, targetPath);

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
   * Find existing file - PRIMARY: by NAME
   *
   * Uses contact name as primary identifier:
   * - Matches files from TheBrain, manual entries, and other sources
   * - Merges Clay data INTO existing vault files
   * - Works with files that don't have clayId yet
   * - Fallback to clayId for files already synced
   */
  private async findExistingFile(contact: TendContact): Promise<string | null> {
    // PRIMARY: Search by name in /40 People/ folder
    // This finds existing files from TheBrain and other sources
    const baseFilename = generateFilename(contact.name);
    const nameBasedPath = path.join(this.contactsFolder, baseFilename);
    if (await fs.pathExists(nameBasedPath)) {
      return nameBasedPath;
    }

    // FALLBACK: Search by clayId in frontmatter
    // Handles cases where contact was renamed in Clay after initial sync
    const fileByClayId = await this.findFileByClayId(contact.clayId);
    if (fileByClayId) {
      return fileByClayId;
    }

    return null;
  }

  /**
   * Search vault for file with matching clayId in frontmatter
   *
   * Algorithm:
   * 1. Check cache first (O(1) lookup) - fast path
   * 2. Cache miss → use async grep to search for clayId pattern
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
      this.removeFromCache(clayId);
    }

    // 2. Cache miss - use async grep to search for clayId (non-blocking)
    const filePath = await this.findFileByGrepClayId(clayId);

    if (filePath) {
      // 3. Found match - update cache for future lookups
      this.updateCache(clayId, filePath);
      return filePath;
    }

    return null;
  }

  /**
   * Use async grep to search for clayId in markdown files
   * Much faster than reading + parsing every file, and non-blocking
   */
  private async findFileByGrepClayId(clayId: number): Promise<string | null> {
    try {
      // Search for pattern: "clayId: 45241459" (YAML format)
      // Using numeric clayId directly is safe (no shell injection risk)
      const pattern = `clayId: ${clayId}`;

      // Use async grep to find files with this pattern in /40 People/ folder
      // -r: recursive, -l: list filenames only, --include: only .md files
      const { stdout } = await execAsync(
        `grep -r "${pattern}" "${this.contactsFolder}" --include="*.md" -l`,
        { encoding: 'utf-8' }
      );

      const result = stdout.trim();
      if (!result) {
        return null;
      }

      // Return first match (should be only one match, but take first if multiple)
      const files = result.split('\n').filter(f => f.length > 0);
      return files[0] || null;
    } catch (error: any) {
      // grep returns exit code 1 if no matches found (normal condition)
      // Only log actual errors
      if (error.code !== 1) {
        console.warn(`[Grep] Error searching for clayId ${clayId}:`, error.message);
      }
      return null;
    }
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
}
