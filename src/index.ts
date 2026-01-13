#!/usr/bin/env node

/**
 * Tend CLI - Sync contact data from Clay.earth MCPs to Obsidian markdown files
 */

import { Command } from 'commander';
import { syncCommand } from './commands/sync';

const program = new Command();

program
  .name('tend')
  .description('Sync contact data from Clay MCPs to Obsidian markdown files')
  .version('1.0.0');

program
  .command('sync')
  .description('Sync contacts from Clay to Obsidian vault')
  .option('-f, --fixture <name>', 'Use fixture file for testing (e.g., "sample")')
  .option('-n, --name <name>', 'Sync a single contact by name')
  .option('-i, --input <file>', 'Sync contacts from input file (one name per line)')
  .option('-v, --vault <path>', 'Vault path (overrides config)')
  .option('--dry-run', 'Preview without writing files')
  .option('--verbose', 'Verbose logging')
  .action(syncCommand);

program.parse();
