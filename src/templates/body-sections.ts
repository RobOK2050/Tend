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

    // User-managed sections (these are never overwritten by Tend)
    sections.push(this.generateUserSection('Notes'));
    sections.push(this.generateUserSection('Journal'));
    sections.push(this.generateUserSection('Thoughts'));

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
   * Generate Contact Details section
   */
  private generateContactDetailsSection(contact: TendContact): string {
    let content = '## Contact Details\n\n';

    if (contact.email.length > 0) {
      content += `**Email:** ${contact.email.join(', ')}\n\n`;
    }

    if (contact.phone.length > 0) {
      content += `**Phone:** ${contact.phone.join(', ')}\n\n`;
    }

    if (contact.location) {
      content += `**Location:** ${contact.location}\n\n`;
    }

    if (contact.bio) {
      content += `**Bio:** ${contact.bio}\n\n`;
    }

    // Social accounts
    if (contact.socialAccounts.length > 0) {
      content += '**Social Accounts:**\n';
      for (const account of contact.socialAccounts) {
        const displayName = account.platform.charAt(0).toUpperCase() + account.platform.slice(1);
        content += `- [${displayName}](${account.url})\n`;
      }
      content += '\n';
    }

    if (contact.birthday) {
      const monthDay = contact.birthday.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric'
      });
      content += `**Birthday:** ${monthDay}\n`;
    }

    return content;
  }

  /**
   * Generate Work History section
   */
  private generateWorkHistorySection(contact: TendContact): string {
    let content = '## Work History\n\n';

    for (const work of contact.workHistory) {
      content += `### ${work.title} at ${work.company}\n\n`;

      if (work.isActive) {
        content += '**Status:** Currently employed\n\n';
      } else if (work.startYear && work.endYear) {
        content += `**Period:** ${work.startYear} - ${work.endYear}\n\n`;
      } else if (work.startYear) {
        content += `**Started:** ${work.startYear}\n\n`;
      }
    }

    return content;
  }

  /**
   * Generate Education History section
   */
  private generateEducationHistorySection(contact: TendContact): string {
    let content = '## Education History\n\n';

    for (const edu of contact.educationHistory) {
      content += `### ${edu.school}\n\n`;

      if (edu.degree) {
        content += `**Degree:** ${edu.degree}\n\n`;
      }

      if (edu.startYear && edu.endYear) {
        content += `**Period:** ${edu.startYear} - ${edu.endYear}\n\n`;
      } else if (edu.startYear) {
        content += `**Started:** ${edu.startYear}\n\n`;
      }
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
