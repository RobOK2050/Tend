/**
 * Vault File Manager - handles reading and writing markdown files to Obsidian vault
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import type { TendContact } from '../models/tend-contact';
import { TemplateEngine } from '../templates/template-engine';
import { generateFilename } from '../utils/file-naming';

export interface FileManagerConfig {
  vaultPath: string;
}


export class VaultFileManager {
  private vaultPath: string;
  private templateEngine: TemplateEngine;
  private groupPriority: string[]; // Loaded from config

  constructor(config: FileManagerConfig) {
    this.vaultPath = config.vaultPath;
    this.templateEngine = new TemplateEngine();
    this.groupPriority = this.loadGroupPriority();

    // Validate vault path
    if (!fs.pathExistsSync(this.vaultPath)) {
      throw new Error(`Vault path does not exist: ${this.vaultPath}`);
    }
  }

  /**
   * Load group priority list from config file
   * Parses markdown list and extracts group names
   */
  private loadGroupPriority(): string[] {
    const configPath = path.join(__dirname, '../../config/group-priority.md');

    if (!fs.pathExistsSync(configPath)) {
      throw new Error(`Group priority config not found: ${configPath}`);
    }

    const content = fs.readFileSync(configPath, 'utf-8');
    const lines = content.split('\n');
    const groups: string[] = [];

    // Parse markdown list items (lines starting with "- ")
    for (const line of lines) {
      const trimmed = line.trim();

      // Skip header, empty lines, and markdown formatting
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('##')) continue;

      // Match list item format: "- groupname" or "1. groupname"
      const match = trimmed.match(/^(?:\d+\.|[\d\w]+\.|-)\s+(.+)$/);
      if (match) {
        const groupName = match[1].trim();
        groups.push(groupName);
      }
    }

    if (groups.length === 0) {
      throw new Error('No groups found in priority config');
    }

    return groups;
  }

  /**
   * Write a contact to a markdown file in the vault
   * Organizes into Grouped/ and Ungrouped/ folders based on community membership
   * If file exists, creates versioned file (e.g., Name-2.md, Name-3.md) up to -5
   * If 5+ versions exist, throws error requiring manual resolution
   */
  async writeContact(contact: TendContact): Promise<{ filepath: string; created: boolean; filename: string }> {
    // Generate base filename
    const baseFilename = generateFilename(contact.name);
    const baseNameWithoutExt = baseFilename.replace('.md', '');
    const ext = '.md';

    // Determine which subfolder based on group membership
    const subfolder = this.getSubfolderForContact(contact);

    // Build the directory path and ensure subfolder exists
    const dirPath = path.join(this.vaultPath, subfolder);
    await fs.ensureDir(dirPath);

    // Find available filename (handling conflicts)
    const { filename, filepath, existed } = await this.findAvailableFilepath(
      dirPath,
      baseNameWithoutExt,
      ext
    );

    // Generate markdown
    const markdown = this.templateEngine.generateMarkdown(contact);

    // Write to file
    await fs.writeFile(filepath, markdown, 'utf-8');

    return {
      filepath,
      filename,
      created: !existed
    };
  }

  /**
   * Find available filepath, handling version conflicts
   * Returns the first available name: originalName.md, then originalName-2.md, etc. up to -5
   * Throws error if all 5 versions are taken
   */
  private async findAvailableFilepath(
    dirPath: string,
    baseNameWithoutExt: string,
    ext: string
  ): Promise<{ filename: string; filepath: string; existed: boolean }> {
    // Try base filename first
    let filename = baseNameWithoutExt + ext;
    let filepath = path.join(dirPath, filename);
    let existed = await fs.pathExists(filepath);

    if (!existed) {
      return { filename, filepath, existed };
    }

    // Try versions -2 through -5
    for (let version = 2; version <= 5; version++) {
      filename = `${baseNameWithoutExt}-${version}${ext}`;
      filepath = path.join(dirPath, filename);
      existed = await fs.pathExists(filepath);

      if (!existed) {
        return { filename, filepath, existed: false };
      }
    }

    // All versions exist - error
    throw new Error(
      `Too many versions of "${baseNameWithoutExt}" exist (5+ versions found). ` +
      `Manual resolution needed. Files: ${baseNameWithoutExt}.md through ${baseNameWithoutExt}-5.md`
    );
  }

  /**
   * Determine which folder a contact belongs to based on group membership
   * Returns "Grouped" if contact has communities, "Ungrouped" otherwise
   */
  /**
   * Determine folder based on group priority list
   * Algorithm: For each priority group (in order), check if contact has that group
   * Returns FIRST MATCH from priority list, or "Ungrouped" as fallback
   *
   * Example:
   * - Contact has: ["5. Wine", "2D. Acquaintance", "Arc Aspicio"]
   * - Priority: ["O. Life Connections", "Family", "Arc Aspicio", ..., "2D. Acquaintance", ...]
   * - Result: "Arc Aspicio" (comes first in priority list)
   */
  private getSubfolderForContact(contact: TendContact): string {
    // No communities at all
    if (!contact.communities || contact.communities.length === 0) {
      return 'Ungrouped';
    }

    // Optimization: If only one group, use it directly (no need to check priority list)
    if (contact.communities.length === 1) {
      return contact.communities[0];
    }

    // Multiple groups: Check each group in the priority list (in order)
    // This ensures we return the HIGHEST PRIORITY group the contact belongs to
    for (const priorityGroup of this.groupPriority) {
      if (contact.communities.includes(priorityGroup)) {
        return priorityGroup;
      }
    }

    // No match in priority list - fallback to Ungrouped
    return 'Ungrouped';
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
    const filepath = path.join(this.vaultPath, filename);
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
    return path.join(this.vaultPath, filename);
  }
}
