/**
 * Sync Command - orchestrates syncing contacts from Clay to Obsidian vault
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { ContactMapper } from '../mappers/contact-mapper';
import { VaultFileManager } from '../vault/file-manager';
import type { ClayContact } from '../models/clay-contact';

interface SyncOptions {
  fixture?: string;
  name?: string;
  input?: string;
  vault?: string;
  dryRun?: boolean;
  verbose?: boolean;
}

export async function syncCommand(options: SyncOptions): Promise<void> {
  try {
    // Determine vault path
    const vaultPath = options.vault || '/Users/Woodmont/Documents/Thoughts in Time/40 Connections';

    if (options.verbose) {
      console.log(chalk.blue('📋 Tend Sync\n'));
      console.log(`Vault: ${vaultPath}`);
      console.log(`Dry Run: ${options.dryRun ? 'YES' : 'NO'}`);
      console.log();
    }

    // Validate vault path
    if (!fs.pathExistsSync(vaultPath)) {
      console.error(chalk.red(`❌ Vault path does not exist: ${vaultPath}`));
      process.exit(1);
    }

    // Get contacts to sync
    const contactData = await getContactData(options);

    if (contactData.length === 0) {
      console.error(chalk.yellow('⚠️  No contacts to sync'));
      process.exit(1);
    }

    // Initialize file manager
    const fileManager = new VaultFileManager({ vaultPath });
    const mapper = new ContactMapper();

    // Track results
    let successCount = 0;
    let errorCount = 0;
    const results: { name: string; status: 'success' | 'error'; message: string }[] = [];

    // Process each contact
    for (let i = 0; i < contactData.length; i++) {
      const clayContact = contactData[i];
      const spinner = ora({
        text: `[${i + 1}/${contactData.length}] Processing ${clayContact.name}`,
        isEnabled: !options.verbose
      }).start();

      try {
        // Map to Tend contact
        const tendContact = mapper.mapClayToTend(clayContact);

        // Write to vault
        if (!options.dryRun) {
          const { filepath, created } = await fileManager.writeContact(tendContact);

          if (options.verbose) {
            spinner.info(
              `✓ ${created ? 'Created' : 'Updated'}: ${path.basename(filepath)}`
            );
          } else {
            spinner.succeed(`${clayContact.name}`);
          }
        } else {
          // Dry run mode - just show what would be created
          const filename = clayContact.name + '.md';
          if (options.verbose) {
            spinner.info(`[DRY RUN] Would create: ${filename}`);
          } else {
            spinner.succeed(`${clayContact.name} (dry run)`);
          }
        }

        successCount++;
        results.push({
          name: clayContact.name,
          status: 'success',
          message: options.dryRun ? 'Would sync' : 'Synced'
        });
      } catch (error) {
        errorCount++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';

        if (!options.verbose) {
          spinner.fail(`${clayContact.name}`);
        }

        results.push({
          name: clayContact.name,
          status: 'error',
          message: errorMsg
        });

        if (options.verbose) {
          console.error(chalk.red(`  ✗ Error: ${errorMsg}`));
        }
      }
    }

    // Summary
    console.log();
    console.log(chalk.blue('Summary:'));
    console.log(chalk.green(`✓ Synced: ${successCount}`));
    if (errorCount > 0) {
      console.log(chalk.red(`✗ Failed: ${errorCount}`));
    }
    console.log();

    // Show errors if verbose
    if (options.verbose && errorCount > 0) {
      console.log(chalk.yellow('Failed contacts:'));
      results
        .filter(r => r.status === 'error')
        .forEach(r => {
          console.log(chalk.red(`  ${r.name}: ${r.message}`));
        });
      console.log();
    }

    if (errorCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red(`Fatal error: ${message}`));
    process.exit(1);
  }
}

/**
 * Get contact data from fixtures or input
 */
async function getContactData(options: SyncOptions): Promise<ClayContact[]> {
  const contacts: ClayContact[] = [];

  // Mode 1: Single fixture (for testing)
  if (options.fixture) {
    const fixturePath = path.join(
      __dirname,
      `../../fixtures/sample-${options.fixture}-contact.json`
    );

    if (!fs.pathExistsSync(fixturePath)) {
      throw new Error(`Fixture not found: ${fixturePath}`);
    }

    const content = await fs.readFile(fixturePath, 'utf-8');
    const contact = JSON.parse(content);
    contacts.push(contact);

    return contacts;
  }

  // Mode 2: Default fixture (sample)
  if (!options.name && !options.input) {
    const fixturePath = path.join(__dirname, '../../fixtures/sample-clay-contact.json');

    if (!fs.pathExistsSync(fixturePath)) {
      throw new Error(`Default fixture not found: ${fixturePath}`);
    }

    const content = await fs.readFile(fixturePath, 'utf-8');
    const contact = JSON.parse(content);
    contacts.push(contact);

    return contacts;
  }

  // Mode 3: Single name (not yet supported - would use MCP)
  if (options.name) {
    throw new Error('Single name search not yet implemented (requires Phase 1D MCP integration)');
  }

  // Mode 4: Input file
  if (options.input) {
    if (!fs.pathExistsSync(options.input)) {
      throw new Error(`Input file not found: ${options.input}`);
    }

    const content = await fs.readFile(options.input, 'utf-8');
    const names = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#'));

    throw new Error(
      `Input file mode not yet implemented (requires Phase 1D MCP integration). Found ${names.length} names in file.`
    );
  }

  return contacts;
}
