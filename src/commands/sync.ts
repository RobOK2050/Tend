/**
 * Sync Command - orchestrates syncing contacts from Clay to Obsidian vault
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { ContactMapper } from '../mappers/contact-mapper';
import { VaultFileManager } from '../vault/file-manager';
import { TendLogger } from '../utils/logger';
import type { ClayContact } from '../models/clay-contact';

interface SyncOptions {
  fixture?: string;
  name?: string;
  input?: string;
  batchSize?: number;
  startFrom?: number;
  resetCheckpoint?: boolean;
  vault?: string;
  dryRun?: boolean;
  verbose?: boolean;
  mcp?: 'official' | 'local'; // MCP strategy: default is 'official'
}

export async function syncCommand(options: SyncOptions): Promise<void> {
  const logger = new TendLogger('Tend-log.md');

  try {
    logger.logCheckpoint('Program Start', `Options: ${JSON.stringify(options)}`);

    // Determine vault path
    const vaultPath = options.vault || '/Users/Woodmont/Documents/Thoughts in Time/40 Connections';

    if (options.verbose) {
      console.log(chalk.blue('📋 Tend Sync\n'));
      console.log(`Vault: ${vaultPath}`);
      console.log(`Dry Run: ${options.dryRun ? 'YES' : 'NO'}`);
      console.log(`Log file: ${logger.getLogFilePath()}`);
      console.log();
    }

    logger.logCheckpoint('Vault Validation', `Path: ${vaultPath}`);

    // Validate vault path
    if (!fs.pathExistsSync(vaultPath)) {
      console.error(chalk.red(`❌ Vault path does not exist: ${vaultPath}`));
      logger.logCheckpoint('✗ Vault Validation Failed', `Path does not exist: ${vaultPath}`);
      process.exit(1);
    }

    logger.logCheckpoint('Data Fetching Start', 'Retrieving contacts from Clay or fixtures');

    // Get contacts to sync
    const contactData = await getContactData(options, logger);

    if (contactData.length === 0) {
      console.error(chalk.yellow('⚠️  No contacts to sync'));
      logger.logCheckpoint('✗ Data Fetching Failed', 'No contacts found');
      process.exit(1);
    }

    logger.logCheckpoint('Data Fetching Complete', `Retrieved ${contactData.length} contact(s)`);
    logger.logCheckpoint('Data Processing Start', 'Beginning contact transformation and vault writing');

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
        logger.logContactProcessing(clayContact.name, 'started');

        // Map to Tend contact
        const tendContact = mapper.mapClayToTend(clayContact);

        // Write to vault
        if (!options.dryRun) {
          const { filepath, filename, created } = await fileManager.writeContact(tendContact);
          const relativePath = path.relative(vaultPath, filepath);

          logger.logContactProcessing(
            clayContact.name,
            'success',
            `${created ? 'Created' : 'Updated'}: ${relativePath}`
          );

          if (options.verbose) {
            spinner.info(
              `✓ ${created ? 'Created' : 'Updated'}: ${relativePath}`
            );
          } else {
            spinner.succeed(`${clayContact.name} → ${filename}`);
          }
        } else {
          // Dry run mode - just show what would be created
          const filename = clayContact.name + '.md';
          logger.logContactProcessing(
            clayContact.name,
            'success',
            `[DRY RUN] Would create: ${filename}`
          );

          if (options.verbose) {
            spinner.info(`[DRY RUN] Would create: ${filename}`);
          } else {
            spinner.succeed(`${clayContact.name} → ${filename} (dry run)`);
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

        logger.logContactProcessing(clayContact.name, 'error', errorMsg);

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
    logger.logSummary(successCount, errorCount, contactData.length);
    logger.logCheckpoint('Program End', `Success: ${successCount}, Failed: ${errorCount}`);

    console.log();
    console.log(chalk.blue('Summary:'));
    console.log(chalk.green(`✓ Synced: ${successCount}`));
    if (errorCount > 0) {
      console.log(chalk.red(`✗ Failed: ${errorCount}`));
    }
    console.log(chalk.gray(`Log file: ${logger.getLogFilePath()}`));
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
    logger.logCheckpoint('✗ Program Error', message);
    console.error(chalk.red(`Fatal error: ${message}`));
    process.exit(1);
  }
}

/**
 * Get contact data from fixtures or input
 */
async function getContactData(options: SyncOptions, logger: TendLogger): Promise<ClayContact[]> {
  const contacts: ClayContact[] = [];

  // Mode 1: Single fixture (for testing)
  if (options.fixture) {
    logger.logCheckpoint('Data Source: Fixture', `Fixture: ${options.fixture}`);
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

    logger.logCheckpoint('Data Source: Fixture Loaded', `Contacts: 1`);
    return contacts;
  }

  // Mode 2: Default fixture (sample)
  if (!options.name && !options.input) {
    logger.logCheckpoint('Data Source: Default Fixture', 'Using sample-clay-contact.json');
    const fixturePath = path.join(__dirname, '../../fixtures/sample-clay-contact.json');

    if (!fs.pathExistsSync(fixturePath)) {
      throw new Error(`Default fixture not found: ${fixturePath}`);
    }

    const content = await fs.readFile(fixturePath, 'utf-8');
    const contact = JSON.parse(content);
    contacts.push(contact);

    logger.logCheckpoint('Data Source: Default Fixture Loaded', `Contacts: 1`);
    return contacts;
  }

  // Mode 3: Single name (uses Clay MCP for real data)
  if (options.name) {
    try {
      logger.logCheckpoint('MCP Initialization', `Strategy: ${options.mcp || 'local'}`);

      // Use factory pattern with selected strategy (default: official)
      const { MCPClientFactory } = await import('../mcp/client');
      const strategy = options.mcp || 'local';

      let mcpClient;
      if (strategy === 'local') {
        // For local strategy, create directly with API key support
        const { ClayLocalMCPClient } = await import('../mcp/clay-local');
        const apiKey = process.env.CLAY_API_KEY;
        mcpClient = new ClayLocalMCPClient(apiKey);
      } else {
        // For official strategy, use factory
        mcpClient = MCPClientFactory.createClient(strategy);
      }

      logger.logMCPCall('searchContacts', { query: options.name, limit: 1 });
      const searchResult = await mcpClient.searchContacts({
        query: options.name,
        limit: 1
      });
      logger.logMCPResult('searchContacts', searchResult.results.length);

      if (searchResult.results.length === 0) {
        throw new Error(`No contact found in Clay: ${options.name}`);
      }

      const contactId = searchResult.results[0].id;
      logger.logMCPCall('getContact', { contact_id: contactId });
      const contact = await mcpClient.getContact(contactId);
      logger.logMCPResult('getContact', 1);

      contacts.push(contact);

      return contacts;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.logCheckpoint('✗ MCP Error', message);
      throw new Error(
        `Cannot search Clay by name:\n${message}\n\n` +
        `Workaround:\n` +
        `1. Use --fixture sample to test with sample data\n` +
        `2. Or use --input <file> with a list of contact names\n` +
        `3. Make sure CLAY_API_KEY environment variable is set`
      );
    }
  }

  // Mode 4: Input file
  if (options.input) {
    logger.logCheckpoint('Data Source: Input File', `File: ${options.input}`);

    if (!fs.pathExistsSync(options.input)) {
      throw new Error(`Input file not found: ${options.input}`);
    }

    // Detect file type (.txt or .csv)
    const isCSV = options.input.endsWith('.csv');

    if (isCSV) {
      return await processCSVFile(options, logger);
    } else {
      return await processTextFile(options, logger);
    }
  }

  return contacts;
}

/**
 * Process simple text file with contact names
 */
async function processTextFile(options: SyncOptions, logger: TendLogger): Promise<ClayContact[]> {
  const contacts: ClayContact[] = [];

  const content = await fs.readFile(options.input!, 'utf-8');
  const names = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'));

  logger.logCheckpoint('Input File Parsed', `Found ${names.length} contact names`);

  // Apply batch size limit if specified
  const batchSize = options.batchSize || names.length;
  const namesToProcess = names.slice(0, batchSize);

  if (batchSize < names.length) {
    console.log(chalk.yellow(`Batch mode: Processing first ${batchSize} of ${names.length} contacts`));
    logger.logCheckpoint('Batch Mode', `Processing ${batchSize} of ${names.length}`);
  }

  // Initialize MCP client
  logger.logCheckpoint('MCP Initialization', `Strategy: ${options.mcp || 'local'}`);

  const { MCPClientFactory } = await import('../mcp/client');
  const strategy = options.mcp || 'local';

  let mcpClient;
  if (strategy === 'local') {
    const { ClayLocalMCPClient } = await import('../mcp/clay-local');
    const apiKey = process.env.CLAY_API_KEY;
    mcpClient = new ClayLocalMCPClient(apiKey);
  } else {
    mcpClient = MCPClientFactory.createClient(strategy);
  }

  // Process each name
  for (const name of namesToProcess) {
    try {
      logger.logMCPCall('searchContacts', { query: name, limit: 1 });
      const searchResult = await mcpClient.searchContacts({
        query: name,
        limit: 1
      });
      logger.logMCPResult('searchContacts', searchResult.results.length);

      if (searchResult.results.length === 0) {
        console.log(chalk.yellow(`⚠️  Contact not found in Clay: ${name}`));
        logger.logCheckpoint('⚠️  Contact Not Found', `Name: ${name}`);
        continue;
      }

      const contactId = searchResult.results[0].id;
      logger.logMCPCall('getContact', { contact_id: contactId });
      const contact = await mcpClient.getContact(contactId);
      logger.logMCPResult('getContact', 1);

      contacts.push(contact);

      // Rate limiting: 100ms delay between API calls
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(chalk.red(`✗ Error fetching ${name}: ${message}`));
      logger.logCheckpoint('✗ MCP Error', `Contact: ${name}, Error: ${message}`);
    }
  }

  logger.logCheckpoint('Input File Processing Complete', `Retrieved ${contacts.length} contacts`);
  return contacts;
}

/**
 * Process CSV file with Clay IDs and checkpoint/resume
 */
async function processCSVFile(options: SyncOptions, logger: TendLogger): Promise<ClayContact[]> {
  const contacts: ClayContact[] = [];
  const { CheckpointManager } = await import('../utils/checkpoint');

  // 1. Initialize checkpoint manager
  const checkpointMgr = new CheckpointManager();

  // 2. Handle reset checkpoint flag
  if (options.resetCheckpoint) {
    await checkpointMgr.resetCheckpoint();
    logger.logCheckpoint('Checkpoint Reset', 'Starting from sequence 1');
  }

  // 3. Get last processed sequence (or use --start-from override)
  let startSequence = options.startFrom !== undefined ? options.startFrom : await checkpointMgr.getLastSequence();
  logger.logCheckpoint('Checkpoint Loaded', `Starting from sequence ${startSequence + 1}`);

  // 4. Parse CSV file
  interface CSVRow {
    FirstName: string;
    LastName: string;
    ClayID: number;
    Sequence: number;
    Groups: string[]; // Array of group names from "Group Membership" column
  }

  const content = await fs.readFile(options.input!, 'utf-8');
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Helper function to parse CSV line with quoted field support
  const parseCSVLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // Add final field
    values.push(current.trim());
    return values;
  };

  // Parse header - handle both standard format and compact format
  const header = parseCSVLine(lines[0]);

  // Determine if this is compact format or standard format
  const isCompactFormat = header.includes('External ID 1 - Value');
  const hasSequenceColumn = header.includes('Sequence');

  // Validate required columns
  if (isCompactFormat) {
    if (!header.includes('External ID 1 - Value')) {
      throw new Error('Compact CSV format requires "External ID 1 - Value" column');
    }
    logger.logCheckpoint('CSV Format', 'Compact format detected (Name, Given Name, Family Name, External ID 1 - Value)');
  } else {
    if (!header.includes('ClayID')) {
      throw new Error('CSV must have ClayID column (or "External ID 1 - Value" for compact format)');
    }
    if (!hasSequenceColumn) {
      logger.logCheckpoint('CSV Format', 'Standard format (auto-generating sequence numbers)');
    }
  }

  // Parse rows
  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: any = {};

    header.forEach((col, idx) => {
      row[col] = values[idx];
    });

    // Map column names to standard format
    let clayId = row.ClayID || row['External ID 1 - Value'];
    let firstName = row.FirstName || row['Given Name'] || '';
    let lastName = row.LastName || row['Family Name'] || '';
    let sequence = row.Sequence ? parseInt(row.Sequence, 10) : i; // Auto-generate sequence as row number if not provided

    // Parse group membership (split by " ::: " and filter out system entries like "* myContacts")
    let groups: string[] = [];
    const groupMembership = row['Group Membership'] || row.Groups || '';
    if (groupMembership) {
      groups = groupMembership
        .split(' ::: ')
        .map((g: string) => g.trim())
        .filter((g: string) => g.length > 0 && !g.startsWith('*')); // Filter out empty and system entries
    }

    // Validate required fields
    if (!clayId) {
      logger.logCheckpoint('⚠️  CSV Parse Warning', `Row ${i + 1} missing Clay ID, skipping`);
      continue;
    }

    rows.push({
      FirstName: firstName,
      LastName: lastName,
      ClayID: parseInt(clayId, 10),
      Sequence: sequence,
      Groups: groups
    });
  }

  logger.logCheckpoint('CSV Parsed', `Total rows: ${rows.length}`);

  // 5. Filter to rows after checkpoint
  const rowsToProcess = rows.filter(r => r.Sequence > startSequence);
  logger.logCheckpoint('Filtered by Checkpoint', `Rows to process: ${rowsToProcess.length}`);

  // 6. Apply batch size limit
  const batchSize = options.batchSize || rowsToProcess.length;
  const batch = rowsToProcess.slice(0, batchSize);

  if (batchSize < rowsToProcess.length) {
    console.log(chalk.yellow(`Batch mode: Processing ${batchSize} of ${rowsToProcess.length} remaining contacts`));
    logger.logCheckpoint('Batch Mode', `Processing ${batchSize} of ${rowsToProcess.length}`);
  }

  // 7. Initialize MCP client
  logger.logCheckpoint('MCP Initialization', `Strategy: ${options.mcp || 'local'}`);

  const { ClayLocalMCPClient } = await import('../mcp/clay-local');
  const apiKey = process.env.CLAY_API_KEY;
  const mcpClient = new ClayLocalMCPClient(apiKey);

  // 8. Process each row
  for (const row of batch) {
    const displayName = `${row.FirstName} ${row.LastName}`.trim() || `Contact ${row.Sequence}`;

    try {
      logger.logMCPCall('getContact', { contact_id: row.ClayID });

      // Fetch contact by Clay ID (direct lookup, no search needed!)
      const contact = await mcpClient.getContact(row.ClayID);

      logger.logMCPResult('getContact', 1);

      // Add groups from CSV to the contact (override Clay's empty groups)
      if (row.Groups && row.Groups.length > 0) {
        contact.groups = row.Groups;
      }

      contacts.push(contact);

      // Update checkpoint after successful processing
      await checkpointMgr.updateCheckpoint(row.Sequence);
      logger.logCheckpoint('Checkpoint Updated', `Sequence: ${row.Sequence}`);

      // Rate limiting: 100ms delay
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(chalk.red(`✗ Error fetching ${displayName} (Seq ${row.Sequence}): ${message}`));
      logger.logCheckpoint('✗ MCP Error', `Sequence: ${row.Sequence}, Error: ${message}`);

      // Don't update checkpoint on error - allows resume from this point
    }
  }

  logger.logCheckpoint('CSV Processing Complete', `Retrieved ${contacts.length} contacts`);
  return contacts;
}
