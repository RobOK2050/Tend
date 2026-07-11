/**
 * Sync Command - orchestrates syncing contacts from Clay to Obsidian vault
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { createHash } from 'crypto';
import chalk from 'chalk';
import ora from 'ora';
import { ContactMapper } from '../mappers/contact-mapper';
import { VaultFileManager } from '../vault/file-manager';
import { TendLogger } from '../utils/logger';
import { StatusTracker } from '../utils/status-tracker';
import { mapCsvRowToClayContact, MeshApiClient, parseGroupMembership } from '../mcp/mesh-api';
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
  source?: 'mesh' | 'csv' | 'local' | 'official';
  reportOnly?: boolean;
  requireGroup?: boolean;
  groups?: string;
  priorityTop?: number;
  skipReview?: boolean; // If true, don't create zReview backups on merge
}

export async function syncCommand(options: SyncOptions): Promise<void> {
  loadLocalEnvFile();
  const logger = new TendLogger('Tend-log.md');

  try {
    logger.logCheckpoint('Program Start', `Options: ${JSON.stringify(options)}`);

    // Determine vault path
    const vaultPath = options.vault || '/Users/Woodmont/Documents/Thoughts in Time/40 Connections';

    if (options.verbose) {
      console.log(chalk.blue('📋 Tend Sync\n'));
      console.log(`Vault: ${vaultPath}`);
      console.log(`Mode: ${formatRunMode(options)}`);
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

    // Initialize file manager and status tracker
    const fileManager = new VaultFileManager({
      vaultPath,
      skipReview: options.skipReview,
      useCache: !options.dryRun && !options.reportOnly
    });
    const statusTracker = new StatusTracker(vaultPath);
    const mapper = new ContactMapper();

    // Track results
    let successCount = 0;
    let errorCount = 0;
    let createdCount = 0;
    let mergedCount = 0;
    let skippedCount = 0; // Unchanged files (optimization)
    const results: { name: string; status: 'success' | 'error'; message: string; created?: boolean; merged?: boolean; skipped?: boolean; group?: string; communities?: string[]; matchMethod?: string; suggestedFilename?: string }[] = [];

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
        let writeResult;
        if (!options.dryRun && !options.reportOnly) {
          writeResult = await fileManager.writeContact(tendContact);
          const relativePath = path.relative(vaultPath, writeResult.filepath);

          const actionLabel = writeResult.created ? 'Created' : writeResult.merged ? 'Merged' : writeResult.skipped ? 'Unchanged' : 'Updated';

          logger.logContactProcessing(
            clayContact.name,
            'success',
            `${actionLabel}: ${relativePath}`
          );

          if (options.verbose) {
            spinner.info(
              `✓ ${actionLabel}: ${relativePath}`
            );

            // Show merge details in verbose mode
            if (writeResult.merged && writeResult.preservedSections) {
              spinner.info(
                `  Preserved: ${writeResult.preservedSections.join(', ')}${writeResult.preservedDateEntries ? ` + ${writeResult.preservedDateEntries} date entries` : ''}`
              );
            }
          } else {
            spinner.succeed(`${clayContact.name} → ${writeResult.filename}`);
          }

          // Track created vs merged vs skipped
          if (writeResult.created) {
            createdCount++;
          } else if (writeResult.merged) {
            mergedCount++;
          } else if (writeResult.skipped) {
            skippedCount++;
          }

          // Add to status file
          statusTracker.addEntry({
            name: clayContact.name,
            status: writeResult.created ? 'Created' : 'Updated',
            communities: clayContact.groups || []
          });
        } else {
          // Dry run/report mode - match locally without writing files
          const plan = await fileManager.planContact(tendContact);
          const relativePath = path.relative(vaultPath, plan.filepath);
          const actionLabel = formatPlanAction(plan.action);

          logger.logContactProcessing(
            clayContact.name,
            'success',
            `[${options.reportOnly ? 'REPORT' : 'DRY RUN'}] ${actionLabel}: ${relativePath}`
          );

          if (options.verbose) {
            const renameNote = plan.suggestedFilename ? ` → suggested filename: ${plan.suggestedFilename}` : '';
            spinner.info(`[${options.reportOnly ? 'REPORT' : 'DRY RUN'}] ${actionLabel}: ${relativePath}${renameNote}`);
          } else {
            spinner.succeed(`${clayContact.name} → ${plan.filename} (${options.reportOnly ? 'report' : 'dry run'})`);
          }

          writeResult = {
            filepath: plan.filepath,
            filename: plan.filename,
            created: plan.action === 'create',
            merged: plan.action !== 'create',
            skipped: false,
            matchMethod: plan.matchMethod,
            suggestedFilename: plan.suggestedFilename
          };

          if (plan.action === 'create') {
            createdCount++;
          } else {
            mergedCount++;
          }
        }

        // Extract group folder from filepath
        const group = writeResult ? path.basename(path.dirname(writeResult.filepath)) : 'Unknown';

        successCount++;
        // Use CSV groups if available (what was provided to sync), otherwise use merged communities
        const displayCommunities = (clayContact.groups && clayContact.groups.length > 0)
          ? clayContact.groups
          : (tendContact.communities && tendContact.communities.length > 0
              ? tendContact.communities.map((c: string) => c.replace(/^\[\[/, '').replace(/\]\]$/, ''))
              : []);

        results.push({
          name: clayContact.name,
          status: 'success',
          message: options.dryRun ? 'Would sync' : 'Synced',
          created: writeResult?.created,
          merged: writeResult?.merged,
          skipped: writeResult?.skipped,
          group,
          communities: displayCommunities,
          matchMethod: writeResult?.matchMethod,
          suggestedFilename: writeResult?.suggestedFilename
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
          message: errorMsg,
          group: 'Failed'
        });

        if (options.verbose) {
          console.error(chalk.red(`  ✗ Error: ${errorMsg}`));
        }
      }
    }

    // Finalize status tracker - writes all entries as new session at top of Tend-status.md
    if (!options.dryRun && !options.reportOnly) {
      statusTracker.finalizeSession();
    }

    // Flush cache - batched write for performance (single disk write instead of per-contact)
    if (!options.dryRun && !options.reportOnly) {
      await fileManager.flushCache();
    }

    // Summary
    logger.logSummary(successCount, errorCount, contactData.length);
    logger.logCheckpoint('Program End', `Success: ${successCount}, Failed: ${errorCount}, Created: ${createdCount}, Merged: ${mergedCount}, Skipped: ${skippedCount}`);

    console.log();
    console.log(chalk.blue('Summary:'));
    const detailParts: string[] = [];
    if (createdCount > 0) detailParts.push(`${createdCount} created`);
    if (mergedCount > 0) detailParts.push(`${mergedCount} merged`);
    if (skippedCount > 0) detailParts.push(`${skippedCount} unchanged`);
    console.log(chalk.green(`✓ ${formatSuccessLabel(options)}: ${successCount}${detailParts.length > 0 ? ` (${detailParts.join(', ')})` : ''}`));
    if (errorCount > 0) {
      console.log(chalk.red(`✗ Failed: ${errorCount}`));
    }
    console.log(chalk.gray(`Log file: ${logger.getLogFilePath()}`));
    console.log();

    // Print detailed contact status summary
    if (results.length > 0 && options.verbose) {
      console.log(chalk.blue('Contact Status Summary:'));

      // Calculate column widths
      const maxNameLength = Math.max(
        ...results.map(r => r.name.length),
        4 // "Name" header
      );
      const statusWidth = 10; // "✓ Success" or "✗ Failed"
      const communitiesWidth = 40; // Communities column

      const totalWidth = maxNameLength + statusWidth + communitiesWidth + 8; // 8 for separators
      console.log('─'.repeat(Math.min(totalWidth, 140)));

      // Print header
      const header = `${'Name'.padEnd(maxNameLength)} | ${'Status'.padEnd(statusWidth)} | Communities`;
      console.log(header);
      console.log('─'.repeat(Math.min(totalWidth, 140)));

      // Print each contact
      results.forEach(r => {
        const statusIcon = r.status === 'success' ? '✓' : '✗';
        const statusLabel = r.status === 'success'
          ? (r.skipped ? 'Unchanged' : r.merged ? 'Merged' : r.created ? 'Created' : 'Updated')
          : 'Failed';
        const statusDisplay = `${statusIcon} ${statusLabel}`.padEnd(statusWidth);
        const communitiesDisplay = r.communities && r.communities.length > 0
          ? r.communities.join(', ')
          : 'Ungrouped';

        const line = `${r.name.padEnd(maxNameLength)} | ${statusDisplay} | ${communitiesDisplay}`;

        // Color code by status
        if (r.status === 'success') {
          console.log(chalk.green(line));
        } else {
          console.log(chalk.red(line));
        }
      });

      console.log('─'.repeat(Math.min(totalWidth, 140)));
      console.log();
    }

    // Show error details
    if (options.verbose && errorCount > 0) {
      console.log(chalk.yellow('Failed contact details:'));
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

    try {
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
    } finally {
      // Clean up MCP process
      await mcpClient.cleanup();
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
  try {
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
  } finally {
    // Clean up MCP process
    await mcpClient.cleanup();
  }

  logger.logCheckpoint('Input File Processing Complete', `Retrieved ${contacts.length} contacts`);
  return contacts;
}

/**
 * Process CSV file with stable Clay/Mesh IDs and checkpoint/resume.
 *
 * Group filters happen before API calls. In report-only mode, rows are mapped
 * from CSV only so the run is fully local and read-only.
 */
async function processCSVFile(options: SyncOptions, logger: TendLogger): Promise<ClayContact[]> {
  const contacts: ClayContact[] = [];
  const { CheckpointManager } = await import('../utils/checkpoint');
  const checkpointMgr = new CheckpointManager();

  if (options.resetCheckpoint) {
    await checkpointMgr.resetCheckpoint();
    logger.logCheckpoint('Checkpoint Reset', 'Starting from sequence 1');
  }

  const startSequence = options.startFrom !== undefined ? options.startFrom : await checkpointMgr.getLastSequence();
  logger.logCheckpoint('Checkpoint Loaded', `Starting from sequence ${startSequence + 1}`);

  interface CSVRow {
    FirstName: string;
    LastName: string;
    Name: string;
    ClayID: number;
    Sequence: number;
    Groups: string[];
    Raw: Record<string, string>;
    RowHash: string;
  }

  const rows = await parseCSVRows(options.input!, logger);
  logger.logCheckpoint('CSV Parsed', `Total rows: ${rows.length}`);

  const rowsAfterCheckpoint = options.reportOnly || options.dryRun
    ? rows
    : rows.filter(r => r.Sequence > startSequence);

  const groupFilter = buildGroupFilter(options);
  const filteredRows: CSVRow[] = [];
  let skippedNoGroup = 0;
  let skippedByGroup = 0;

  for (const row of rowsAfterCheckpoint) {
    if (options.requireGroup && row.Groups.length === 0) {
      skippedNoGroup++;
      continue;
    }

    if (groupFilter && !row.Groups.some(group => groupFilter.has(group))) {
      skippedByGroup++;
      continue;
    }

    filteredRows.push(row);
  }

  logger.logCheckpoint(
    'CSV Group Filtering',
    `Included: ${filteredRows.length}, Skipped no group: ${skippedNoGroup}, Skipped by group filter: ${skippedByGroup}`
  );

  if (options.verbose || options.reportOnly) {
    console.log(chalk.blue('CSV filter summary:'));
    console.log(`Rows after checkpoint: ${rowsAfterCheckpoint.length}`);
    console.log(`Included: ${filteredRows.length}`);
    if (skippedNoGroup > 0) console.log(`Skipped without real groups: ${skippedNoGroup}`);
    if (skippedByGroup > 0) console.log(`Skipped outside selected groups: ${skippedByGroup}`);
    console.log();
  }

  const batchSize = options.batchSize || filteredRows.length;
  const batch = filteredRows.slice(0, batchSize);

  if (batchSize < filteredRows.length) {
    console.log(chalk.yellow(`Batch mode: Processing ${batchSize} of ${filteredRows.length} included contacts`));
    logger.logCheckpoint('Batch Mode', `Processing ${batchSize} of ${filteredRows.length}`);
  }

  const source = options.reportOnly ? 'csv' : (options.source || 'mesh');
  logger.logCheckpoint('CSV Contact Source', source);

  let mcpClient: any = null;
  let meshClient: MeshApiClient | null = null;

  if (source === 'mesh') {
    meshClient = new MeshApiClient();
  } else if (source === 'local') {
    const { ClayLocalMCPClient } = await import('../mcp/clay-local');
    mcpClient = new ClayLocalMCPClient(process.env.CLAY_API_KEY);
  } else if (source === 'official') {
    const { MCPClientFactory } = await import('../mcp/client');
    mcpClient = MCPClientFactory.createClient('official');
  }

  try {
    for (const row of batch) {
      const displayName = row.Name || `${row.FirstName} ${row.LastName}`.trim() || `Contact ${row.Sequence}`;

      try {
        let contact: ClayContact;
        const metadata = {
          csvRowHash: row.RowHash,
          meshSyncedAt: new Date().toISOString()
        };

        if (source === 'mesh' && meshClient) {
          logger.logMCPCall('mesh.getContact', { contact_id: row.ClayID });
          contact = await meshClient.getContact(row.ClayID, metadata);
          logger.logMCPResult('mesh.getContact', 1);
        } else if ((source === 'local' || source === 'official') && mcpClient) {
          logger.logMCPCall('getContact', { contact_id: row.ClayID });
          contact = await mcpClient.getContact(row.ClayID);
          logger.logMCPResult('getContact', 1);
        } else {
          contact = mapCsvRowToClayContact(row.Raw, {
            ...metadata,
            source: 'csv'
          });
        }

        if (row.Groups.length > 0) {
          contact.groups = row.Groups;
        }
        contact.csvRowHash = row.RowHash;

        contacts.push(contact);

        if (!options.reportOnly && !options.dryRun) {
          await checkpointMgr.updateCheckpoint(row.Sequence);
          logger.logCheckpoint('Checkpoint Updated', `Sequence: ${row.Sequence}`);
        }

        if (source !== 'csv') {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red(`✗ Error fetching ${displayName} (Seq ${row.Sequence}): ${message}`));
        logger.logCheckpoint('✗ Contact Fetch Error', `Sequence: ${row.Sequence}, Error: ${message}`);
      }
    }
  } finally {
    if (mcpClient) {
      await mcpClient.cleanup();
    }
  }

  const validContacts = contacts.filter(contact => {
    if (!contact || !contact.name) {
      console.warn(chalk.yellow(`⚠️  Skipping invalid contact: ID ${contact?.id || 'unknown'}`));
      return false;
    }
    return true;
  });

  logger.logCheckpoint('CSV Processing Complete', `Retrieved ${validContacts.length} valid contacts (${contacts.length} total)`);
  return validContacts;
}

async function parseCSVRows(input: string, logger: TendLogger): Promise<Array<{
  FirstName: string;
  LastName: string;
  Name: string;
  ClayID: number;
  Sequence: number;
  Groups: string[];
  Raw: Record<string, string>;
  RowHash: string;
}>> {
  const content = await fs.readFile(input, 'utf-8');
  const records = parseCSVContent(content);

  if (records.length === 0) {
    throw new Error('CSV file is empty');
  }

  const header = records[0];
  const isCompactFormat = header.includes('External ID 1 - Value');
  const hasSequenceColumn = header.includes('Sequence');

  if (isCompactFormat) {
    logger.logCheckpoint('CSV Format', 'Mesh compact/rich export detected');
  } else if (!header.includes('ClayID')) {
    throw new Error('CSV must have ClayID column (or "External ID 1 - Value" for Mesh exports)');
  } else if (!hasSequenceColumn) {
    logger.logCheckpoint('CSV Format', 'Standard format (auto-generating sequence numbers)');
  }

  const rows: Array<{
    FirstName: string;
    LastName: string;
    Name: string;
    ClayID: number;
    Sequence: number;
    Groups: string[];
    Raw: Record<string, string>;
    RowHash: string;
  }> = [];

  for (let i = 1; i < records.length; i++) {
    const values = records[i];
    if (values.every(value => value.trim().length === 0)) {
      continue;
    }
    const raw: Record<string, string> = {};

    header.forEach((col, idx) => {
      raw[col] = values[idx] || '';
    });

    const clayId = raw.ClayID || raw['External ID 1 - Value'];
    if (!clayId) {
      logger.logCheckpoint('⚠️  CSV Parse Warning', `Row ${i + 1} missing Clay/Mesh ID, skipping`);
      continue;
    }

    rows.push({
      FirstName: raw.FirstName || raw['Given Name'] || '',
      LastName: raw.LastName || raw['Family Name'] || '',
      Name: raw.Name || '',
      ClayID: parseInt(clayId, 10),
      Sequence: raw.Sequence ? parseInt(raw.Sequence, 10) : i,
      Groups: parseGroupMembership(raw['Group Membership'] || raw.Groups || ''),
      Raw: raw,
      RowHash: createHash('sha256').update(JSON.stringify(raw)).digest('hex')
    });
  }

  return rows;
}

function parseCSVContent(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(current.trim());
      current = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(current.trim());
      current = '';
      if (row.some(value => value.length > 0)) {
        rows.push(row);
      }
      row = [];
    } else {
      current += char;
    }
  }

  row.push(current.trim());
  if (row.some(value => value.length > 0)) {
    rows.push(row);
  }

  return rows;
}

function buildGroupFilter(options: SyncOptions): Set<string> | null {
  const selectedGroups = new Set<string>();

  if (options.groups) {
    options.groups
      .split(',')
      .map(group => group.trim())
      .filter(Boolean)
      .forEach(group => selectedGroups.add(group));
  }

  if (options.priorityTop && options.priorityTop > 0) {
    for (const group of loadPriorityGroups(options.priorityTop)) {
      selectedGroups.add(group);
    }
  }

  return selectedGroups.size > 0 ? selectedGroups : null;
}

function loadPriorityGroups(limit: number): string[] {
  const priorityPath = path.join(process.cwd(), 'config/group-priority.md');
  if (!fs.pathExistsSync(priorityPath)) {
    return [];
  }

  const groups: string[] = [];
  const content = fs.readFileSync(priorityPath, 'utf-8');
  for (const line of content.split('\n')) {
    const match = line.trim().match(/^\d+\.\s+(.+)$/);
    if (match) {
      groups.push(match[1].trim());
      if (groups.length >= limit) break;
    }
  }
  return groups;
}

function formatPlanAction(action: string): string {
  switch (action) {
    case 'create':
      return 'Would create';
    case 'merge':
      return 'Would merge by ID';
    case 'adopt-legacy':
      return 'Would adopt legacy note by name';
    case 'suggest-rename':
      return 'Would merge by ID';
    default:
      return 'Would update';
  }
}

function formatRunMode(options: SyncOptions): string {
  if (options.reportOnly) return 'REPORT ONLY';
  if (options.dryRun) return 'DRY RUN';
  return 'WRITE';
}

function formatSuccessLabel(options: SyncOptions): string {
  if (options.reportOnly) return 'Report OK';
  if (options.dryRun) return 'Would sync';
  return 'Synced';
}

function loadLocalEnvFile(): void {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.pathExistsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '');
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
