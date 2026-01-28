/**
 * Status Tracker - maintains a status table in the vault for all synced contacts
 * Most recent session at the top
 */

import * as fs from 'fs-extra';

export interface StatusEntry {
  name: string;
  status: 'Created' | 'Updated';
  communities: string[];
}

export class StatusTracker {
  private statusFilePath: string;
  private sessionEntries: StatusEntry[] = [];

  constructor(vaultPath: string) {
    this.statusFilePath = `${vaultPath}/Tend-status.md`;
    this.initializeStatusFile();
  }

  /**
   * Initialize status file with header (create if not exists)
   */
  private initializeStatusFile(): void {
    if (!fs.pathExistsSync(this.statusFilePath)) {
      const header = `# Contact Sync Status

Automatically generated status table of all synced contacts. Most recent batches at top.
`;
      fs.writeFileSync(this.statusFilePath, header, 'utf-8');
    }
  }

  /**
   * Add a contact entry to session (queued for batch write)
   */
  addEntry(entry: StatusEntry): void {
    this.sessionEntries.push(entry);
  }

  /**
   * Format timestamp as "YYYY-MM-DD HH:MM AM/PM"
   */
  private formatTimestamp(): string {
    const now = new Date();
    return now.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  /**
   * Finalize the session: write all entries as new table at top of file
   * This should be called once at the end of sync
   */
  finalizeSession(): void {
    if (this.sessionEntries.length === 0) {
      return; // Nothing to write
    }

    // Read existing content
    const existingContent = fs.readFileSync(this.statusFilePath, 'utf-8');

    // Extract intro (everything before first ## session header or first |------|)
    let introSection = '';
    let oldContent = '';
    const lines = existingContent.split('\n');
    let introEndIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('## ') || lines[i].includes('|------|')) {
        introEndIndex = i;
        break;
      }
    }

    if (introEndIndex === -1) {
      // No existing tables, all is intro
      introSection = existingContent;
      oldContent = '';
    } else {
      introSection = lines.slice(0, introEndIndex).join('\n');
      oldContent = lines.slice(introEndIndex).join('\n');
    }

    // Build new session header
    const timestamp = this.formatTimestamp();
    const sessionHeader = `## ${timestamp}\n\n| Name | Status | Communities |\n|------|--------|-------------|`;

    // Build table rows
    const rows: string[] = [];
    for (const entry of this.sessionEntries) {
      const communitiesStr = entry.communities.length > 0
        ? entry.communities.join(', ')
        : '—';

      // Wrap name in [[wikilinks]] for Obsidian clickability
      const nameLink = `[[${entry.name}]]`;
      const row = `| ${nameLink} | ${entry.status} | ${this.escapeMarkdown(communitiesStr)} |`;
      rows.push(row);
    }

    // Combine: intro + new session + old content
    let newContent = introSection;
    if (!introSection.endsWith('\n')) {
      newContent += '\n';
    }
    newContent += '\n' + sessionHeader + '\n' + rows.join('\n') + '\n';
    if (oldContent.trim()) {
      newContent += '\n' + oldContent;
    }

    // Write back
    fs.writeFileSync(this.statusFilePath, newContent, 'utf-8');

    // Clear session
    this.sessionEntries = [];
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
