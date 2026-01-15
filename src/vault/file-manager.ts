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

/**
 * Communities that get their own subfolders
 * Ordered by priority (first match wins if contact is in multiple)
 */
const SPECIAL_COMMUNITIES = ['Family', 'Bitcoin', 'Arc Aspicio', 'Photography'] as const;

export class VaultFileManager {
  private vaultPath: string;
  private templateEngine: TemplateEngine;

  constructor(config: FileManagerConfig) {
    this.vaultPath = config.vaultPath;
    this.templateEngine = new TemplateEngine();

    // Validate vault path
    if (!fs.pathExistsSync(this.vaultPath)) {
      throw new Error(`Vault path does not exist: ${this.vaultPath}`);
    }
  }

  /**
   * Write a contact to a markdown file in the vault
   * Organizes into subfolders based on special communities (Family, Bitcoin, Arc Aspicio, Photography)
   * Other contacts go in the main vault folder
   * If file exists, overwrites it (Phase 1.2 will add intelligent merge logic)
   */
  async writeContact(contact: TendContact): Promise<{ filepath: string; created: boolean }> {
    // Generate filename
    const filename = generateFilename(contact.name);

    // Determine which subfolder (if any) based on communities
    const subfolder = this.getSubfolderForContact(contact);

    // Build the directory path
    let dirPath = this.vaultPath;
    if (subfolder) {
      dirPath = path.join(this.vaultPath, subfolder);
      // Ensure subfolder exists
      await fs.ensureDir(dirPath);
    }

    const filepath = path.join(dirPath, filename);

    // Check if file exists
    const existed = await fs.pathExists(filepath);

    // Generate markdown
    const markdown = this.templateEngine.generateMarkdown(contact);

    // Write to file (creates or overwrites)
    await fs.writeFile(filepath, markdown, 'utf-8');

    return {
      filepath,
      created: !existed
    };
  }

  /**
   * Determine which special community subfolder a contact belongs to
   * Returns the first matching community in priority order, or null for main folder
   */
  private getSubfolderForContact(contact: TendContact): string | null {
    for (const community of SPECIAL_COMMUNITIES) {
      if (contact.communities.includes(community)) {
        return community;
      }
    }
    return null;
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
