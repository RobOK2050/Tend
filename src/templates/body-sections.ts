/**
 * Body Section Generator - creates markdown body sections from contact data
 */

import type { TendContact } from '../models/tend-contact';

export class BodySectionGenerator {
  /**
   * Generate all body sections for a contact
   */
  generateBody(contact: TendContact): string {
    const sections: string[] = [];

    // Links section
    sections.push(this.generateLinksSection(contact));

    // Contact Details section
    sections.push(this.generateContactDetailsSection(contact));

    // Work History section (if exists)
    if (contact.workHistory.length > 0) {
      sections.push(this.generateWorkHistorySection(contact));
    }

    // Education History section (if exists)
    if (contact.educationHistory.length > 0) {
      sections.push(this.generateEducationHistorySection(contact));
    }

    // Interaction History section
    sections.push(this.generateInteractionHistorySection(contact));

    // Clay Notes section (if exists)
    if (contact.clayNotes.length > 0) {
      sections.push(this.generateClayNotesSection(contact));
    }

    // Horizontal rule to separate system sections from user sections
    sections.push('---\n');

    // User-managed sections (never overwritten by Tend)
    sections.push(this.generateUserSection('Notes'));
    sections.push(this.generateUserSection('Family Notes'));

    return sections.join('\n\n');
  }

  /**
   * Generate Links section (for Obsidian wikilinks)
   */
  private generateLinksSection(contact: TendContact): string {
    let content = '## Links\n\n';

    // Add backlink suggestions
    content += '[[400 People and Relationships MOC | People and Relationships]]\n';
    content += '[[++Home | Index]]\n';

    // Add TheBrain links if they exist
    if (contact.brainLinks.length > 0) {
      content += '\n### TheBrain References\n';
      for (const link of contact.brainLinks) {
        content += `- [[${link.thoughtName}]]\n`;
      }
    }

    return content;
  }

  /**
   * Generate Contact Details section (compact table format)
   */
  private generateContactDetailsSection(contact: TendContact): string {
    let content = '## Contact Details\n\n';
    const rows: string[] = [];

    // Email
    if (contact.email.length > 0) {
      rows.push(`| Email | ${contact.email.join(', ')} |`);
    }

    // Phone
    if (contact.phone.length > 0) {
      rows.push(`| Phone | ${contact.phone.join(', ')} |`);
    }

    // Location
    if (contact.location) {
      rows.push(`| Location | ${contact.location} |`);
    }

    // Organization & Title
    if (contact.organization || contact.title) {
      const org = contact.organization || '';
      const title = contact.title || '';
      rows.push(`| Role | ${title}${org ? ` @ ${org}` : ''} |`);
    }

    // Birthday
    if (contact.birthday) {
      const monthDay = contact.birthday.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      rows.push(`| Birthday | ${monthDay} |`);
    }

    // Social accounts (each on own row or one row with links)
    if (contact.socialAccounts.length > 0) {
      const socialLinks = contact.socialAccounts
        .map(account => {
          const displayName = account.platform.charAt(0).toUpperCase() + account.platform.slice(1);
          return `[${displayName}](${account.url})`;
        })
        .join(' · ');
      rows.push(`| Social | ${socialLinks} |`);
    }

    // Build table if we have rows
    if (rows.length > 0) {
      content += '| | |\n';
      content += '|---|---|\n';
      content += rows.join('\n');
    } else {
      content += '[No contact details available]';
    }

    // Add bio at the end if exists
    if (contact.bio) {
      content += `\n\n**About:**\n${contact.bio}`;
    }

    return content;
  }

  /**
   * Generate Work History section (compact one-liners)
   */
  private generateWorkHistorySection(contact: TendContact): string {
    let content = '## Work History\n\n';

    for (const work of contact.workHistory) {
      let entry = `- ${work.title} @ ${work.company}`;

      if (work.isActive) {
        entry += ' (current)';
      } else if (work.startYear && work.endYear) {
        entry += ` [${work.startYear}-${work.endYear}]`;
      } else if (work.startYear) {
        entry += ` [since ${work.startYear}]`;
      }

      content += entry + '\n';
    }

    return content;
  }

  /**
   * Generate Education History section (compact one-liners)
   */
  private generateEducationHistorySection(contact: TendContact): string {
    let content = '## Education\n\n';

    for (const edu of contact.educationHistory) {
      let entry = edu.school;

      if (edu.degree) {
        entry += ` - ${edu.degree}`;
      }

      if (edu.startYear && edu.endYear) {
        entry += ` [${edu.startYear}-${edu.endYear}]`;
      } else if (edu.startYear) {
        entry += ` [${edu.startYear}]`;
      }

      content += `- ${entry}\n`;
    }

    return content;
  }

  /**
   * Generate Interaction History section
   */
  private generateInteractionHistorySection(contact: TendContact): string {
    let content = '## Interaction History\n\n';

    const stats = contact.interactionStats;

    content += `**Relationship Score:** ${contact.relationshipScore}/100\n\n`;

    if (stats.firstInteraction) {
      content += `**First Interaction:** ${stats.firstInteraction.toISOString().split('T')[0]}\n\n`;
    }

    if (stats.lastInteraction) {
      content += `**Last Interaction:** ${stats.lastInteraction.toISOString().split('T')[0]}\n\n`;
    }

    if (stats.messageCount > 0 || stats.emailCount > 0 || stats.eventCount > 0) {
      content += '**Activity:**\n';
      if (stats.emailCount > 0) content += `- ${stats.emailCount} emails exchanged\n`;
      if (stats.messageCount > 0) content += `- ${stats.messageCount} messages\n`;
      if (stats.eventCount > 0) content += `- ${stats.eventCount} calendar events\n`;
      content += '\n';
    }

    return content;
  }

  /**
   * Generate Clay Notes section
   */
  private generateClayNotesSection(contact: TendContact): string {
    let content = '## Clay Notes\n\n';

    for (let i = 0; i < contact.clayNotes.length; i++) {
      content += `- ${contact.clayNotes[i]}\n`;
    }

    return content;
  }

  /**
   * Generate a user-managed section (placeholder)
   */
  private generateUserSection(heading: string): string {
    return `## ${heading}\n\n[User notes - preserved across syncs]`;
  }
}
