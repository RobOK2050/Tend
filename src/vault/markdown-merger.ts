/**
 * Markdown Merger - merges existing markdown with fresh Clay data
 */

import * as YAML from 'yaml';
import type { Frontmatter, SystemSection, UserSection, DateEntry } from '../models/vault-file';
import type { ParsedMarkdown } from './markdown-parser';

export interface MergeResult {
  markdown: string;
  preservedSections: string[]; // Names of preserved user sections
  preservedDateEntries: number; // Count of preserved date entries
  updatedSections: string[]; // Names of updated system sections
}

export class MarkdownMerger {
  /**
   * Merge existing markdown with fresh Clay data
   *
   * Strategy:
   * 1. Merge frontmatter (Clay data wins for system fields, preserve user fields)
   * 2. Keep fresh system sections from new markdown
   * 3. Preserve user sections and date entries from existing markdown
   * 4. Reassemble with system sections first, then user sections, then date entries
   */
  merge(existing: ParsedMarkdown, fresh: ParsedMarkdown): MergeResult {
    // 1. Merge frontmatter
    const mergedFrontmatter = this.mergeFrontmatter(existing.frontmatter, fresh.frontmatter);

    // 2. Prepare system sections: use fresh sections as base
    let systemSections = [...fresh.systemSections];

    // 3. Always preserve existing Notes section (user-managed content with subsections and dates)
    // If Notes exists in existing, use it; otherwise, create an empty one
    const existingNotes = existing.systemSections.find(s => s.heading === 'Notes');
    const freshNotesIndex = systemSections.findIndex(s => s.heading === 'Notes');

    if (existingNotes) {
      // Preserve existing Notes (don't replace with fresh)
      if (freshNotesIndex >= 0) {
        systemSections[freshNotesIndex] = existingNotes;
      } else {
        // Fresh doesn't have Notes, add the preserved one
        systemSections.push(existingNotes);
      }
    }

    // 4. Preserve existing user sections
    const userSections = existing.userSections;

    // 5. Preserve existing date entries
    const dateEntries = existing.dateEntries;

    // 6. Reassemble markdown
    const markdown = this.assembleMarkdown(mergedFrontmatter, systemSections, userSections, dateEntries);

    // 7. Track what was preserved and updated
    const preservedSections = (existingNotes ? ['Notes'] : []).concat(userSections.map(s => s.heading));
    const preservedDateEntries = dateEntries.length;
    const updatedSections = systemSections
      .map(s => s.heading)
      .filter(h => h !== 'Notes'); // Notes is preserved, not updated

    return {
      markdown,
      preservedSections,
      preservedDateEntries,
      updatedSections
    };
  }

  /**
   * Merge frontmatter with SMART strategy:
   * - ALWAYS update Clay-managed fields from fresh data (name, bio, title, email, etc.)
   * - PRESERVE user-managed fields (custom properties, priorities, notes, etc.)
   * - COMBINE communities instead of replacing (add fresh to existing, deduplicated)
   * - NEVER delete existing properties
   *
   * Example: Existing has {customField: "value", communities: ["Family"], name: "Old Name"}
   * Fresh has {title: "Engineer", name: "New Name", communities: ["Arc"]}
   * Result: {customField: "value", communities: ["Family", "Arc"], name: "New Name", title: "Engineer"}
   */
  private mergeFrontmatter(existing: Frontmatter, fresh: Frontmatter): Frontmatter {
    // Fields that come from Clay - ALWAYS update from fresh
    const clayFields = [
      'name',
      'type',
      'clayId',
      'status',
      'updated',
      'bio',
      'email',
      'phone',
      'location',
      'social',
      'tags',
      'lastContact',
      'organization',
      'title',
      'industry',
      'relationshipScore',
      'interactions',
      'clayUrl',
      'clayCreated',
      'clayIntegrations'
    ];

    // Start with existing frontmatter - preserves all user-managed fields
    const merged: Frontmatter = { ...existing };

    // Update Clay fields ALWAYS from fresh data (even if they exist in merged)
    for (const field of clayFields) {
      if (fresh[field] !== undefined) {
        merged[field] = fresh[field];
      }
    }

    // SPECIAL HANDLING: Communities - combine instead of replace
    // Merge: existing communities + fresh communities (deduplicated)
    const existingCommunities = (existing.communities || []) as string[];
    const freshCommunities = (fresh.communities || []) as string[];

    // Combine and deduplicate
    const allCommunities = [...new Set([...existingCommunities, ...freshCommunities])];
    if (allCommunities.length > 0) {
      merged.communities = allCommunities;
    }

    return merged;
  }

  /**
   * Assemble complete markdown from components
   *
   * Structure:
   * ---
   * [frontmatter YAML]
   * ---
   *
   * [Links - contact info]
   *
   * ---
   *
   * ## Notes
   * [User-managed content with subsections]
   * [Date entries - sorted descending]
   *
   * ---
   *
   * [Clay sections - Work History, Education, Interaction History, Clay Notes]
   */
  private assembleMarkdown(
    frontmatter: Frontmatter,
    systemSections: SystemSection[],
    userSections: UserSection[],
    dateEntries: DateEntry[]
  ): string {
    const lines: string[] = [];

    // 1. Frontmatter
    const yamlString = YAML.stringify(frontmatter, { indent: 2 });
    lines.push('---');
    lines.push(yamlString.trim());
    lines.push('---');
    lines.push('');

    // 2. Links section (before separator)
    const systemSectionMap = new Map(systemSections.map(s => [s.heading, s]));
    const linksSection = systemSectionMap.get('Links');
    if (linksSection) {
      lines.push(`${'#'.repeat(linksSection.level)} ${linksSection.heading}`);
      lines.push('');
      lines.push(linksSection.content);
      lines.push('');
    }

    // 3. Separator before user content
    lines.push('---');
    lines.push('');

    // 4. Notes section - user-managed (can have subsections with ###)
    const notesSection = systemSectionMap.get('Notes');
    if (notesSection) {
      lines.push(`${'#'.repeat(notesSection.level)} ${notesSection.heading}`);
      lines.push('');
      lines.push(notesSection.content);
      lines.push('');
    }

    // 5. Date entries (sorted descending by date) - part of Notes
    const sortedDates = [...dateEntries].sort((a, b) => b.date.localeCompare(a.date));
    for (const entry of sortedDates) {
      lines.push(`${'#'.repeat(entry.level)} ${entry.date}`);
      lines.push('');
      lines.push(entry.content);
      lines.push('');
    }

    // 6. User sections (preserved from existing file)
    for (const section of userSections) {
      lines.push(`${'#'.repeat(section.level)} ${section.heading}`);
      lines.push('');
      lines.push(section.content);
      lines.push('');
    }

    // 7. Separator before Clay sections
    lines.push('---');
    lines.push('');

    // 8. Clay sections (in standard order)
    const clayOrder = [
      'Work History',
      'Education',
      'Interaction History',
      'Clay Notes'
    ];

    for (const sectionName of clayOrder) {
      const section = systemSectionMap.get(sectionName);
      if (section) {
        lines.push(`${'#'.repeat(section.level)} ${section.heading}`);
        lines.push('');
        lines.push(section.content);
        lines.push('');
      }
    }

    return lines.join('\n').trim() + '\n';
  }
}
