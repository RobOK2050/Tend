/**
 * Contact Mapper - transforms Clay contact data to Tend's normalized format
 */

import type { ClayContact, WorkHistory, EducationHistory } from '../models/clay-contact';
import type {
  TendContact,
  ContactType,
  ContactStatus,
  Priority,
  SocialAccount,
  BrainLink,
  WorkHistoryNormalized,
  EducationHistoryNormalized
} from '../models/tend-contact';

export class ContactMapper {
  /**
   * Map a Clay contact to a Tend contact
   */
  mapClayToTend(clay: ClayContact): TendContact {
    return {
      // Core Identity
      name: clay.name,
      displayName: clay.displayName !== clay.name ? clay.displayName : undefined,
      type: this.inferContactType(clay),
      id: String(clay.id),
      status: this.inferStatus(clay),

      // Contact Information
      email: clay.emails,
      phone: clay.phone_numbers,
      location: clay.location,
      socialAccounts: this.extractSocialAccounts(clay.social_links),

      // Relationship Context
      tags: this.inferTags(clay),
      priority: this.inferPriority(clay),
      lastContact: this.getLastContactDate(clay),
      nextFollowup: null, // User-managed field

      // Professional
      organization: this.getCurrentOrganization(clay.work_history),
      title: this.getCurrentTitle(clay.work_history),
      industry: this.inferIndustry(clay.work_history),
      workHistory: this.normalizeWorkHistory(clay.work_history),
      educationHistory: this.normalizeEducationHistory(clay.education_history),

      // Personal
      interests: this.extractInterests(clay),
      valuesAlignment: [], // User-managed field
      bio: clay.bio,
      birthday: this.parseBirthday(clay.birthday),

      // Source References
      clayId: clay.id,
      clayUrl: clay.url,
      avatarUrl: clay.avatarURL,

      // Interaction Metrics
      relationshipScore: clay.score,
      interactionStats: {
        firstInteraction: this.parseDate(clay.interaction_history.first_date),
        lastInteraction: this.parseDate(clay.interaction_history.last_date),
        messageCount: clay.message_history.count,
        emailCount: clay.email_history.count,
        eventCount: clay.event_history.count
      },

      // Metadata
      clayCreated: new Date(clay.created),
      tendCreated: new Date(),
      tendUpdated: new Date(),
      clayIntegrations: clay.integrations,

      // Notes
      clayNotes: clay.notes,

      // TheBrain Links
      brainLinks: this.extractBrainLinks(clay.notes)
    };
  }

  /**
   * Extract social accounts from URLs
   */
  private extractSocialAccounts(links: string[]): SocialAccount[] {
    return links.map(url => ({
      platform: this.detectPlatform(url),
      url
    }));
  }

  /**
   * Detect social media platform from URL
   */
  private detectPlatform(url: string): string {
    if (url.includes('linkedin.com')) return 'linkedin';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    if (url.includes('facebook.com')) return 'facebook';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('github.com')) return 'github';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    return 'other';
  }

  /**
   * Extract TheBrain links from notes
   * Format: brain://api.thebrain.com/{brainId}/{thoughtId}/{thoughtName}
   */
  private extractBrainLinks(notes: string[]): BrainLink[] {
    const brainLinks: BrainLink[] = [];
    const brainUrlPattern = /brain:\/\/api\.thebrain\.com\/([^\/]+)\/([^\/]+)\/([^\s)]+)/g;

    for (const note of notes) {
      let match;
      while ((match = brainUrlPattern.exec(note)) !== null) {
        brainLinks.push({
          brainId: match[1],
          thoughtId: match[2],
          thoughtName: decodeURIComponent(match[3]),
          url: match[0]
        });
      }
    }

    return brainLinks;
  }

  /**
   * Infer contact type based on name patterns and profile data
   */
  private inferContactType(clay: ClayContact): ContactType {
    // Check for organization keywords in name
    if (clay.name.match(/\b(Inc|LLC|Corp|Company|Consulting|Group|Ltd|LLP)\b/i)) {
      return 'organization';
    }

    // If work_history has companies but no person-like information, might be org
    // But default to person unless we have strong signals
    return 'person';
  }

  /**
   * Infer contact status
   */
  private inferStatus(clay: ClayContact): ContactStatus {
    if (clay.isMemorialized) return 'archived';

    const lastInteraction = this.parseDate(clay.interaction_history.last_date);
    if (!lastInteraction) return 'dormant';

    const daysSinceInteraction = Math.floor(
      (Date.now() - lastInteraction.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceInteraction > 365) return 'dormant';
    return 'active';
  }

  /**
   * Infer tags based on integrations and patterns
   */
  private inferTags(clay: ClayContact): string[] {
    const tags: string[] = ['people'];

    // Add tags based on integrations
    if (clay.integrations.includes('linkedin')) tags.push('linkedin');
    if (clay.integrations.includes('twitter')) tags.push('twitter');
    if (clay.integrations.includes('calendar')) tags.push('calendar');

    return tags;
  }

  /**
   * Infer priority based on relationship score
   */
  private inferPriority(clay: ClayContact): Priority {
    if (clay.score >= 80) return 'high';
    if (clay.score >= 40) return 'medium';
    return 'low';
  }

  /**
   * Get last contact date from interaction history
   */
  private getLastContactDate(clay: ClayContact): Date | null {
    // Use the most recent of all interaction types
    const dates = [
      this.parseDate(clay.interaction_history.last_date),
      this.parseDate(clay.message_history.last_date),
      this.parseDate(clay.email_history.last_date),
      this.parseDate(clay.event_history.last_date)
    ].filter((d): d is Date => d !== null);

    if (dates.length === 0) return null;

    return new Date(Math.max(...dates.map(d => d.getTime())));
  }

  /**
   * Get current organization from work history
   */
  private getCurrentOrganization(workHistory: WorkHistory[]): string | null {
    const current = workHistory.find(w => w.is_active);
    return current?.company || (workHistory[0]?.company ?? null);
  }

  /**
   * Get current title from work history
   */
  private getCurrentTitle(workHistory: WorkHistory[]): string | null {
    const current = workHistory.find(w => w.is_active);
    return current?.title || (workHistory[0]?.title ?? null);
  }

  /**
   * Infer industry from work history
   */
  private inferIndustry(workHistory: WorkHistory[]): string[] {
    const industries: string[] = [];

    // Extract common industry patterns from company names
    const companies = workHistory.map(w => w.company.toLowerCase()).join(' ');

    if (companies.includes('tech') || companies.includes('software') || companies.includes('google'))
      industries.push('Technology');
    if (companies.includes('finance') || companies.includes('bank')) industries.push('Finance');
    if (companies.includes('consult')) industries.push('Consulting');
    if (companies.includes('government') || companies.includes('federal'))
      industries.push('Government');

    return industries;
  }

  /**
   * Normalize work history
   */
  private normalizeWorkHistory(workHistory: WorkHistory[]): WorkHistoryNormalized[] {
    return workHistory.map(w => ({
      company: w.company,
      title: w.title,
      isActive: w.is_active,
      startYear: w.start_year,
      endYear: w.end_year
    }));
  }

  /**
   * Normalize education history
   */
  private normalizeEducationHistory(educationHistory: EducationHistory[]): EducationHistoryNormalized[] {
    return educationHistory.map(e => ({
      school: e.school,
      degree: e.degree,
      startYear: e.start_year,
      endYear: e.end_year
    }));
  }

  /**
   * Extract interests from notes and integrations
   */
  private extractInterests(clay: ClayContact): string[] {
    const interests: string[] = [];

    // Look for interest keywords in notes
    const notesText = clay.notes.join(' ').toLowerCase();
    if (notesText.includes('bitcoin')) interests.push('Bitcoin');
    if (notesText.includes('photography')) interests.push('Photography');
    if (notesText.includes('ai') || notesText.includes('artificial')) interests.push('AI');
    if (notesText.includes('government')) interests.push('Government');
    if (notesText.includes('tech')) interests.push('Technology');

    return interests;
  }

  /**
   * Parse ISO date string to Date object
   */
  private parseDate(dateStr: string | null): Date | null {
    if (!dateStr) return null;
    try {
      return new Date(dateStr);
    } catch {
      return null;
    }
  }

  /**
   * Parse birthday string
   * Format: "M/D/YYYY" or "M/D" (when year is unknown)
   */
  private parseBirthday(birthdayStr: string | null): Date | null {
    if (!birthdayStr) return null;

    try {
      const parts = birthdayStr.split('/');
      if (parts.length === 2) {
        // No year provided, use current year as placeholder
        return new Date(new Date().getFullYear(), parseInt(parts[0]) - 1, parseInt(parts[1]));
      } else if (parts.length === 3) {
        return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
      }
    } catch {
      return null;
    }

    return null;
  }
}
