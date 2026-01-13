/**
 * Development script to test markdown generation
 * Run with: npm run dev:template
 */

import * as fs from 'fs';
import * as path from 'path';
import { ContactMapper } from '../mappers/contact-mapper';
import { TemplateEngine } from '../templates/template-engine';
import type { ClayContact } from '../models/clay-contact';

async function main() {
  console.log('📝 Testing Markdown Generation...\n');

  // Load sample Clay contact
  const fixturePath = path.join(__dirname, '../../fixtures/sample-clay-contact.json');
  const fixtureContent = fs.readFileSync(fixturePath, 'utf-8');
  const sampleClayContact: ClayContact = JSON.parse(fixtureContent);

  console.log(`📥 Loaded Clay contact: ${sampleClayContact.name}\n`);

  // Map to Tend contact
  const mapper = new ContactMapper();
  const tendContact = mapper.mapClayToTend(sampleClayContact);

  // Generate markdown
  const engine = new TemplateEngine();
  const markdown = engine.generateMarkdown(tendContact);

  // Display the generated markdown
  console.log('✅ Generated Markdown:\n');
  console.log('═'.repeat(80));
  console.log(markdown);
  console.log('═'.repeat(80));
  console.log();

  // Save to fixtures for reference
  const outputPath = path.join(__dirname, '../../fixtures/expected-output.md');
  fs.writeFileSync(outputPath, markdown, 'utf-8');
  console.log(`💾 Saved to: fixtures/expected-output.md\n`);

  // Display file stats
  const lines = markdown.split('\n').length;
  const chars = markdown.length;
  console.log(`📊 Markdown Stats:`);
  console.log(`   Lines: ${lines}`);
  console.log(`   Characters: ${chars}`);
  console.log();

  console.log('✨ Markdown generation test completed successfully!\n');
}

main().catch(console.error);
