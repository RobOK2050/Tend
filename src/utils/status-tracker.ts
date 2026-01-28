/**
 * Status Tracker - maintains a status table in the vault for all synced contacts
 */

import * as fs from 'fs-extra';

export interface StatusEntry {
  name: string;
  status: 'Created' | 'Updated';
  communities: string[];
}

export class StatusTracker {
  private statusFilePath: string;

  constructor(vaultPath: string) {
    this.statusFilePath = `${vaultPath}/Tend-status.md`;
    this.initializeStatusFile();
  }

  /**
   * Initialize status file with table header (create if not exists)
   */
  private initializeStatusFile(): void {
    if (!fs.pathExistsSync(this.statusFilePath)) {
      const header = `# Contact Sync Status

Automatically generated status table of all synced contacts.

| Name | Status | Communities |
|------|--------|-------------|
`;
      fs.writeFileSync(this.statusFilePath, header, 'utf-8');
    }
  }

  /**
   * Add a contact entry to the status table
   */
  addEntry(entry: StatusEntry): void {
    const communitiesStr = entry.communities.length > 0
      ? entry.communities.join(', ')
      : '—';

    // Wrap name in [[wikilinks]] for Obsidian clickability
    const nameLink = `[[${entry.name}]]`;

    const row = `| ${nameLink} | ${entry.status} | ${this.escapeMarkdown(communitiesStr)} |\n`;

    fs.appendFileSync(this.statusFilePath, row, 'utf-8');
  }

  /**
   * Escape markdown special characters in table cells
   */
  private escapeMarkdown(text: string): string {
    return text.replace(/\|/g, '\\|');
  }

  /**
   * Get the status file path
   */
  getStatusFilePath(): string {
    return this.statusFilePath;
  }
}
