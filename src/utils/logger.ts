/**
 * Logger utility - writes execution checkpoints to Tend-log.md
 */

import * as fs from 'fs-extra';
import * as path from 'path';

export interface LogEntry {
  checkpoint: string;
  timestamp: string;
  duration?: string;
  details?: string;
}

export class TendLogger {
  private logFilePath: string;
  private startTime: Date;
  private checkpointTimes: Map<string, Date> = new Map();

  constructor(logFilePath: string = 'Tend-log.md') {
    this.logFilePath = logFilePath;
    this.startTime = new Date();
    this.initializeLog();
  }

  /**
   * Initialize log file with header
   */
  private initializeLog(): void {
    const header = `# Tend Sync Log

Generated at: ${this.formatTimestamp(new Date())}

---

## Execution Checkpoints

`;
    fs.writeFileSync(this.logFilePath, header, 'utf-8');
  }

  /**
   * Log a checkpoint
   */
  logCheckpoint(checkpoint: string, details?: string): void {
    const now = new Date();
    const timestamp = this.formatTimestamp(now);

    // Calculate duration from start
    const durationMs = now.getTime() - this.startTime.getTime();
    const duration = this.formatDuration(durationMs);

    // Store checkpoint time for relative calculations
    this.checkpointTimes.set(checkpoint, now);

    // Build log entry
    let entry = `### ${checkpoint}\n`;
    entry += `- **Time**: ${timestamp}\n`;
    entry += `- **Duration from start**: ${duration}\n`;

    if (details) {
      entry += `- **Details**: ${details}\n`;
    }

    entry += '\n';

    // Append to log file
    fs.appendFileSync(this.logFilePath, entry, 'utf-8');
  }

  /**
   * Log MCP call with tool name and parameters
   */
  logMCPCall(toolName: string, params: any): void {
    const details = `Tool: \`${toolName}\` | Params: ${JSON.stringify(params)}`;
    this.logCheckpoint(`MCP Call: ${toolName}`, details);
  }

  /**
   * Log MCP result with result count
   */
  logMCPResult(toolName: string, resultCount?: number): void {
    const details = resultCount !== undefined
      ? `Tool: \`${toolName}\` | Results: ${resultCount}`
      : `Tool: \`${toolName}\``;
    this.logCheckpoint(`MCP Result: ${toolName}`, details);
  }

  /**
   * Log contact processing
   */
  logContactProcessing(contactName: string, status: 'started' | 'success' | 'error', message?: string): void {
    let checkpoint = `Processing Contact: ${contactName}`;
    let details = '';

    if (status === 'success') {
      checkpoint = `✓ Contact Synced: ${contactName}`;
      details = message || '';
    } else if (status === 'error') {
      checkpoint = `✗ Contact Error: ${contactName}`;
      details = message || 'Unknown error';
    }

    this.logCheckpoint(checkpoint, details);
  }

  /**
   * Log summary
   */
  logSummary(successCount: number, errorCount: number, totalCount: number): void {
    const endTime = new Date();
    const totalDuration = this.formatDuration(endTime.getTime() - this.startTime.getTime());

    let summary = `### Program Complete\n`;
    summary += `- **Total Duration**: ${totalDuration}\n`;
    summary += `- **Total Contacts**: ${totalCount}\n`;
    summary += `- **Successful**: ${successCount}\n`;
    summary += `- **Failed**: ${errorCount}\n`;
    summary += `- **Success Rate**: ${totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(1) : 0}%\n`;
    summary += '\n';

    fs.appendFileSync(this.logFilePath, summary, 'utf-8');
  }

  /**
   * Format timestamp as readable string (EST timezone)
   */
  private formatTimestamp(date: Date): string {
    return this.toEST(date);
  }

  /**
   * Convert Date to EST timezone string (YYYY-MM-DD H:MM:SS AM/PM EST)
   */
  private toEST(date: Date): string {
    const estDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));

    const year = estDate.getFullYear();
    const month = String(estDate.getMonth() + 1).padStart(2, '0');
    const day = String(estDate.getDate()).padStart(2, '0');

    let hours = estDate.getHours();
    const minutes = String(estDate.getMinutes()).padStart(2, '0');
    const seconds = String(estDate.getSeconds()).padStart(2, '0');

    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;

    const formattedHours = String(hours).padStart(2, ' ');

    return `${year}-${month}-${day} ${formattedHours}:${minutes}:${seconds} ${ampm} EST`;
  }

  /**
   * Format duration in milliseconds to human-readable format
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(2)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = ((ms % 60000) / 1000).toFixed(2);
      return `${minutes}m ${seconds}s`;
    }
  }

  /**
   * Get the log file path
   */
  getLogFilePath(): string {
    return this.logFilePath;
  }
}
