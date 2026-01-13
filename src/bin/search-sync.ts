#!/usr/bin/env node

/**
 * Search and Sync CLI Wrapper
 *
 * Quick way to search Clay and sync to Obsidian in one command
 *
 * Usage:
 *   ts-node src/bin/search-sync.ts "Contact Name"
 *   node dist/bin/search-sync.js "Contact Name"
 *
 * From Claude Code:
 *   Run: npx ts-node src/bin/search-sync.ts "Harry Oppenheim"
 */

import chalk from 'chalk';
import { ContactMapper } from '../mappers/contact-mapper';
import { VaultFileManager } from '../vault/file-manager';
import * as fs from 'fs-extra';
import * as path from 'path';

async function main() {
  const contactName = process.argv[2];

  if (!contactName) {
    console.log(chalk.yellow('Usage: search-sync "Contact Name"\n'));
    console.log('Examples:');
    console.log('  search-sync "Harry Oppenheim"');
    console.log('  search-sync "Jane Doe"\n');
    console.log('Instructions:');
    console.log('1. Use clay-mcp to search for contact');
    console.log('2. Get contact details');
    console.log('3. This script syncs to Obsidian\n');
    process.exit(1);
  }

  try {
    console.log(chalk.blue(`🔍 Searching for: ${contactName}\n`));

    // For now, use fixture and show workflow
    console.log(chalk.yellow('📋 Workflow (when MCP is connected):'));
    console.log('');
    console.log('Step 1: Search Clay');
    console.log(`  clay-mcp:searchContacts { query: "${contactName}", limit: 1 }`);
    console.log('');
    console.log('Step 2: Get full contact');
    console.log('  clay-mcp:getContact { contact_id: <ID from Step 1> }');
    console.log('');
    console.log('Step 3: Sync to Obsidian (automatic once MCP returns data)');
    console.log('');

    console.log(chalk.blue('─'.repeat(60)));
    console.log('');

    // Current: Use sample fixture as demo
    console.log(chalk.green('✓ Demo: Using sample fixture data\n'));

    const fixturePath = path.join(__dirname, '../../fixtures/sample-clay-contact.json');
    const fixtureContent = await fs.readFile(fixturePath, 'utf-8');
    const clayContact = JSON.parse(fixtureContent);

    const vaultPath = '/Users/Woodmont/Documents/Thoughts in Time/40 Connections';
    const fileManager = new VaultFileManager({ vaultPath });
    const mapper = new ContactMapper();

    const tendContact = mapper.mapClayToTend(clayContact);
    const { filepath, created } = await fileManager.writeContact(tendContact);

    console.log(chalk.green(`✓ ${created ? 'Created' : 'Updated'}: ${clayContact.name}`));
    console.log(chalk.gray(`  ${filepath}`));
    console.log('');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red(`❌ Error: ${message}`));
    process.exit(1);
  }
}

main();
