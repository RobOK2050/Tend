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
   * If file exists, overwrites it (Phase 1.2 will add intelligent merge logic)
   */
  async writeContact(contact: TendContact): Promise<{ filepath: string; created: boolean }> {
    // Generate filename
    const filename = generateFilename(contact.name);
    const filepath = path.join(this.vaultPath, filename);

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
