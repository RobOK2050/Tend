/**
 * Search and Sync Command - orchestrates searching Clay and syncing to Obsidian
 *
 * This is designed to work with Claude Code:
 * 1. Claude Code calls clay-mcp:searchContacts to find contact
 * 2. Claude Code calls this sync with the results
 *
 * OR use as standalone: npx ts-node src/commands/search-and-sync.ts "Contact Name"
 */

import chalk from 'chalk';
import ora from 'ora';
import { ContactMapper } from '../mappers/contact-mapper';
import { VaultFileManager } from '../vault/file-manager';
import type { ClayContact } from '../models/clay-contact';

export interface SearchAndSyncOptions {
  contactName: string;
  contact?: ClayContact; // Optional: pre-fetched contact data
  vault?: string;
  verbose?: boolean;
}

export async function searchAndSyncCommand(options: SearchAndSyncOptions): Promise<void> {
  try {
    const vaultPath = options.vault || '/Users/Woodmont/Documents/Thoughts in Time/40 Connections';

    if (options.verbose) {
      console.log(chalk.blue('🔍 Search and Sync\n'));
      console.log(`Looking for: ${options.contactName}`);
      console.log(`Vault: ${vaultPath}\n`);
    }

    // If contact data is provided, use it directly
    // Otherwise, would need to search via MCP
    if (!options.contact) {
      throw new Error(
        `To use search-and-sync:\n\n` +
        `Option A: Via Claude Code\n` +
        `1. Use: clay-mcp:searchContacts { query: "Contact Name" }\n` +
        `2. Get contact ID from results\n` +
        `3. Use: clay-mcp:getContact { contact_id: ID }\n` +
        `4. Then call: tend search-and-sync "Contact Name" --contact <data>\n\n` +
        `Option B: Use fixture for testing\n` +
        `tend sync --fixture sample\n`
      );
    }

    // Initialize file manager
    const fileManager = new VaultFileManager({ vaultPath });
    const mapper = new ContactMapper();

    // Map and sync
    const spinner = ora(`Syncing ${options.contactName}`).start();

    const tendContact = mapper.mapClayToTend(options.contact);
    const { filepath, created } = await fileManager.writeContact(tendContact);

    const action = created ? 'Created' : 'Updated';
    spinner.succeed(
      chalk.green(`✓ ${action}: ${options.contactName}`)
    );

    if (options.verbose) {
      console.log();
      console.log(chalk.blue('Details:'));
      console.log(`File: ${filepath}`);
      console.log(`Status: ${created ? 'New' : 'Updated'}`);
      console.log();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red(`Error: ${message}`));
    process.exit(1);
  }
}
