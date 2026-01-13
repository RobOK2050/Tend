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

    // Professional header section
    sections.push(this.generateProfessionalHeader(contact));

    // Horizontal rule after header
    sections.push('---');

    // Contact information links
    sections.push(this.generateContactLinksSection(contact));

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
   * Generate professional header section (top of file, very clean)
   */
  private generateProfessionalHeader(contact: TendContact): string {
    let content = '';

    // Large name as H1
    content += `# ${contact.name}\n\n`;

    // Bio/headline as italic
    if (contact.bio) {
      content += `*${contact.bio}*\n\n`;
    }

    // Current role and location on one line
    const roleAndLocation: string[] = [];
    if (contact.title && contact.organization) {
      roleAndLocation.push(`**${contact.title}** @ ${contact.organization}`);
    } else if (contact.title) {
      roleAndLocation.push(`**${contact.title}**`);
    } else if (contact.organization) {
      roleAndLocation.push(`**${contact.organization}**`);
    }

    if (contact.location) {
      roleAndLocation.push(contact.location);
    }

    if (roleAndLocation.length > 0) {
      content += roleAndLocation.join(' · ') + '\n\n';
    }

    // Birthday in light/muted font
    if (contact.birthday) {
      const monthDay = contact.birthday.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric'
      });
      content += `_Birthday: ${monthDay}_`;
    }

    return content;
  }

  /**
   * Generate contact links section (email, phone, socials, brain links)
   */
  private generateContactLinksSection(contact: TendContact): string {
    const links: string[] = [];

    // Email
    if (contact.email.length > 0) {
      for (const email of contact.email) {
        links.push(`[${email}](mailto:${email})`);
      }
    }

    // Phone
    if (contact.phone.length > 0) {
      for (const phone of contact.phone) {
        links.push(`[${phone}](tel:${phone.replace(/\s/g, '')})`);
      }
    }

    // Social accounts
    if (contact.socialAccounts.length > 0) {
      for (const account of contact.socialAccounts) {
        const displayName = account.platform.charAt(0).toUpperCase() + account.platform.slice(1);
        links.push(`[${displayName}](${account.url})`);
      }
    }

    // TheBrain links as wikilinks
    const brainLinks: string[] = [];
    if (contact.brainLinks.length > 0) {
      for (const link of contact.brainLinks) {
        brainLinks.push(`[[${link.thoughtName}]]`);
      }
    }

    // Build content
    let content = links.join(' · ');

    if (brainLinks.length > 0) {
      if (content) content += '\n\n';
      content += brainLinks.join(' · ');
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
