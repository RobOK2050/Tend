/**
 * Markdown Parser - parses existing markdown files into structured sections
 */

import matter from 'gray-matter';
import type { Frontmatter, SystemSection, UserSection, DateEntry } from '../models/vault-file';
import { SECTION_CONFIG } from '../models/vault-file';

export interface ParsedMarkdown {
  frontmatter: Frontmatter;
  systemSections: SystemSection[];
  userSections: UserSection[];
  dateEntries: DateEntry[];
  rawContent: string;
}

export interface Section {
  heading: string;
  level: number; // 2 for ##, 3 for ###, 4 for ####
  content: string;
  type: 'system' | 'user' | 'date';
}

export class MarkdownParser {
  // Pre-compiled regexes for performance (avoid recompilation per line)
  private static readonly HEADER_REGEX = /^(##|####)\s+(.+)$/;
  private static readonly DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

  /**
   * Parse complete markdown file into structured components
   */
  parse(content: string): ParsedMarkdown {
    // Use gray-matter to extract frontmatter and body
    const { data, content: body } = matter(content);

    // Parse frontmatter
    const frontmatter = this.parseFrontmatter(data);

    // Parse body into sections
    const sections = this.splitIntoSections(body);

    // Categorize sections
    const systemSections: SystemSection[] = [];
    const userSections: UserSection[] = [];
    const dateEntries: DateEntry[] = [];

    for (const section of sections) {
      if (section.type === 'system') {
        systemSections.push({
          heading: section.heading,
          level: section.level,
          content: section.content,
          systemManaged: true
        });
      } else if (section.type === 'user') {
        userSections.push({
          heading: section.heading,
          level: section.level,
          content: section.content,
          systemManaged: false,
          preserve: true
        });
      } else if (section.type === 'date') {
        dateEntries.push({
          date: section.heading,
          level: section.level,
          content: section.content,
          preserve: true
        });
      }
    }

    return {
      frontmatter,
      systemSections,
      userSections,
      dateEntries,
      rawContent: content
    };
  }

  /**
   * Parse frontmatter object, ensuring it matches Frontmatter interface
   */
  private parseFrontmatter(data: any): Frontmatter {
    // gray-matter returns an object, ensure it has required fields
    // If data is empty or invalid, return a minimal frontmatter
    if (!data || typeof data !== 'object') {
      data = {};
    }

    // Ensure required fields exist (or will be filled by merge logic)
    return {
      name: data.name || 'Unknown',
      type: data.type || 'person',
      clayId: data.clayId || 0,
      status: data.status || 'active',
      created: data.created || new Date().toISOString().split('T')[0],
      updated: data.updated || new Date().toISOString().split('T')[0],
      ...data // Spread remaining fields
    };
  }

  /**
   * Split markdown body into sections (## and #### headers)
   * Returns array of Section objects with heading, level, content, and type
   *
   * IMPORTANT: Preserves content before first section header by prepending to Notes
   * This is critical for files from other programs that don't use ## headers
   * If Notes exists, preamble is prepended; otherwise, preamble becomes Notes content
   */
  private splitIntoSections(body: string): Section[] {
    const sections: Section[] = [];
    const lines = body.split('\n');

    let currentSection: Section | null = null;
    let currentContent: string[] = [];
    let preambleContent: string[] = []; // Content before any section header

    for (const line of lines) {
      // Match headers: ## (2 hashes) and #### (4 hashes) only
      // Skip ### (3 hashes) - these are subsections within parent sections
      // This allows hierarchical structure: ## Section > ### Subsection > content
      const headerMatch = line.match(MarkdownParser.HEADER_REGEX);

      if (headerMatch) {
        // Save previous section
        if (currentSection) {
          currentSection.content = currentContent.join('\n').trim();
          sections.push(currentSection);
        }

        // Start new section
        const level = headerMatch[1].length;
        const heading = headerMatch[2].trim();
        const type = this.categorizeSection(heading);

        currentSection = { heading, level, content: '', type };
        currentContent = [];
      } else {
        // Add line to content (either current section or preamble)
        if (currentSection) {
          currentContent.push(line);
        } else {
          preambleContent.push(line);
        }
      }
    }

    // Save final section
    if (currentSection) {
      currentSection.content = currentContent.join('\n').trim();
      sections.push(currentSection);
    }

    // Handle preamble content: prepend to Notes section or create Notes from preamble
    const preambleText = preambleContent.join('\n').trim();
    if (preambleText) {
      const notesIndex = sections.findIndex(s => s.heading === 'Notes');
      if (notesIndex >= 0) {
        // Prepend preamble to existing Notes content
        sections[notesIndex].content = preambleText + '\n\n' + sections[notesIndex].content;
      } else {
        // Create Notes section from preamble
        sections.unshift({
          heading: 'Notes',
          level: 2,
          content: preambleText,
          type: 'system'
        });
      }
    }

    return sections;
  }

  /**
   * Categorize section as 'system', 'user', or 'date'
   *
   * Rules:
   * 1. If heading matches ####YYYY-MM-DD pattern → 'date'
   * 2. If heading in SECTION_CONFIG.systemSections → 'system'
   * 3. If heading in SECTION_CONFIG.userSections → 'user'
   * 4. Otherwise → 'user' (preserve by default, treat unknown sections as user-managed)
   */
  private categorizeSection(heading: string): 'system' | 'user' | 'date' {
    // Check if date entry (####YYYY-MM-DD format)
    if (MarkdownParser.DATE_REGEX.test(heading)) {
      return 'date';
    }

    // Check against SECTION_CONFIG
    if (SECTION_CONFIG.systemSections.includes(heading)) {
      return 'system';
    }

    if (SECTION_CONFIG.userSections.includes(heading)) {
      return 'user';
    }

    // Unknown sections default to 'user' (preserve by default)
    return 'user';
  }
}
