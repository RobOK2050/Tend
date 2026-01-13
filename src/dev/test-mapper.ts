/**
 * Development script to test the contact mapper with fixture data
 * Run with: npm run dev:mapper
 */

import * as fs from 'fs';
import * as path from 'path';
import { ContactMapper } from '../mappers/contact-mapper';
import type { ClayContact } from '../models/clay-contact';

async function main() {
  console.log('🔍 Testing Contact Mapper with fixture data...\n');

  // Load sample Clay contact
  const fixturePath = path.join(__dirname, '../../fixtures/sample-clay-contact.json');
  const fixtureContent = fs.readFileSync(fixturePath, 'utf-8');
  const sampleClayContact: ClayContact = JSON.parse(fixtureContent);

  console.log('📥 Loaded sample Clay contact:');
  console.log(`   Name: ${sampleClayContact.name}`);
  console.log(`   ID: ${sampleClayContact.id}`);
  console.log(`   Emails: ${sampleClayContact.emails.join(', ')}`);
  console.log(`   Social Links: ${sampleClayContact.social_links.join(', ')}\n`);

  // Map to Tend contact
  const mapper = new ContactMapper();
  const tendContact = mapper.mapClayToTend(sampleClayContact);

  console.log('✅ Mapped to Tend contact:\n');

  // Display mapped data
  console.log('Core Identity:');
  console.log(`  Name: ${tendContact.name}`);
  console.log(`  Type: ${tendContact.type}`);
  console.log(`  Status: ${tendContact.status}`);
  console.log(`  ID: ${tendContact.id}`);
  console.log(`  Priority: ${tendContact.priority}\n`);

  console.log('Contact Information:');
  console.log(`  Emails: ${tendContact.email.join(', ')}`);
  console.log(`  Phones: ${tendContact.phone.join(', ')}`);
  console.log(`  Location: ${tendContact.location}`);
  console.log(`  Social Accounts: ${tendContact.socialAccounts.length}`);
  tendContact.socialAccounts.forEach(sa => {
    console.log(`    - ${sa.platform}: ${sa.url}`);
  });
  console.log();

  console.log('Professional:');
  console.log(`  Organization: ${tendContact.organization}`);
  console.log(`  Title: ${tendContact.title}`);
  console.log(`  Industries: ${tendContact.industry.join(', ')}`);
  console.log(`  Work History Items: ${tendContact.workHistory.length}`);
  tendContact.workHistory.forEach(w => {
    console.log(`    - ${w.title} at ${w.company}${w.isActive ? ' (Current)' : ''}`);
  });
  console.log();

  console.log('Interaction Metrics:');
  console.log(`  Relationship Score: ${tendContact.relationshipScore}`);
  console.log(`  Last Contact: ${tendContact.lastContact?.toISOString().split('T')[0]}`);
  console.log(`  Message Count: ${tendContact.interactionStats.messageCount}`);
  console.log(`  Email Count: ${tendContact.interactionStats.emailCount}`);
  console.log(`  Event Count: ${tendContact.interactionStats.eventCount}`);
  console.log();

  console.log('Additional Data:');
  console.log(`  Bio: ${tendContact.bio?.substring(0, 60)}...`);
  console.log(`  Tags: ${tendContact.tags.join(', ')}`);
  console.log(`  Interests: ${tendContact.interests.join(', ')}`);
  console.log(`  Clay Notes: ${tendContact.clayNotes.length}`);
  console.log(`  TheBrain Links: ${tendContact.brainLinks.length}`);

  if (tendContact.brainLinks.length > 0) {
    console.log('    Brain Links:');
    tendContact.brainLinks.forEach(bl => {
      console.log(`      - ${bl.thoughtName}`);
    });
  }
  console.log();

  console.log('Metadata:');
  console.log(`  Clay Created: ${tendContact.clayCreated.toISOString().split('T')[0]}`);
  console.log(`  Tend Created: ${tendContact.tendCreated.toISOString().split('T')[0]}`);
  console.log(`  Clay URL: ${tendContact.clayUrl}`);
  console.log();

  console.log('✨ Mapper test completed successfully!\n');
}

main().catch(console.error);
