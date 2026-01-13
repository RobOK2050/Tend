/**
 * Frontmatter Generator - converts Tend contacts to YAML frontmatter
 */

import * as YAML from 'yaml';
import type { TendContact } from '../models/tend-contact';
import type { Frontmatter } from '../models/vault-file';

export class FrontmatterGenerator {
  /**
   * Generate YAML frontmatter from a Tend contact
   */
  generateFrontmatter(contact: TendContact): string {
    const frontmatter = this.buildFrontmatterObject(contact);
    const yamlString = YAML.stringify(frontmatter, { indent: 2 });
    return yamlString.trim();
  }

  /**
   * Build frontmatter object with all necessary fields
   */
  private buildFrontmatterObject(contact: TendContact): Frontmatter {
    return {
      // Core Identity
      name: contact.name,
      type: contact.type,
      clayId: contact.clayId,
      status: contact.status,
      created: this.formatDate(contact.clayCreated),
      updated: this.formatDate(contact.tendUpdated),

      // Contact Information
      ...(contact.email.length > 0 && { email: contact.email }),
      ...(contact.phone.length > 0 && { phone: contact.phone }),
      ...(contact.location && { location: contact.location }),
      ...(contact.socialAccounts.length > 0 && {
        social: this.buildSocialObject(contact.socialAccounts)
      }),

      // Relationship Context
      ...(contact.tags.length > 0 && { tags: contact.tags }),
      ...(contact.priority && { priority: contact.priority }),
      ...(contact.lastContact && { lastContact: this.formatDate(contact.lastContact) }),
      ...(contact.nextFollowup && {
        nextFollowup: this.formatDate(contact.nextFollowup)
      }),

      // Professional
      ...(contact.organization && { organization: contact.organization }),
      ...(contact.title && { title: contact.title }),
      ...(contact.industry.length > 0 && { industry: contact.industry }),

      // Personal
      ...(contact.interests.length > 0 && { interests: contact.interests }),
      ...(contact.valuesAlignment.length > 0 && {
        valuesAlignment: contact.valuesAlignment
      }),
      ...(contact.birthday && { birthday: this.formatDate(contact.birthday) }),

      // Source References
      clayUrl: contact.clayUrl,
      clayCreated: this.formatDate(contact.clayCreated),
      ...(contact.clayIntegrations.length > 0 && {
        clayIntegrations: contact.clayIntegrations
      }),

      // Interaction Metrics
      relationshipScore: contact.relationshipScore,
      interactions: {
        first: contact.interactionStats.firstInteraction
          ? this.formatDate(contact.interactionStats.firstInteraction)
          : '',
        last: contact.interactionStats.lastInteraction
          ? this.formatDate(contact.interactionStats.lastInteraction)
          : '',
        messageCount: contact.interactionStats.messageCount,
        emailCount: contact.interactionStats.emailCount,
        eventCount: contact.interactionStats.eventCount
      }
    };
  }

  /**
   * Build social accounts object from array
   */
  private buildSocialObject(socialAccounts: any[]): { [key: string]: string } {
    const social: { [key: string]: string } = {};
    for (const account of socialAccounts) {
      social[account.platform] = account.url;
    }
    return social;
  }

  /**
   * Format date to YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
