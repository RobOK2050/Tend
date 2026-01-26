/**
 * Unit tests for MarkdownMerger
 */

import { MarkdownMerger } from '../markdown-merger';
import { MarkdownParser } from '../markdown-parser';

describe('MarkdownMerger', () => {
  let merger: MarkdownMerger;
  let parser: MarkdownParser;

  beforeEach(() => {
    merger = new MarkdownMerger();
    parser = new MarkdownParser();
  });

  describe('merge - frontmatter strategy', () => {
    it('should use fresh Clay data for standard fields', () => {
      const existing = parser.parse(`---
name: Old Name
clayId: 123
status: active
email:
  - old@example.com
---

## Notes

User notes`);

      const fresh = parser.parse(`---
name: New Name
clayId: 456
status: inactive
email:
  - new@example.com
---

## Links

Links`);

      const result = merger.merge(existing, fresh);
      const merged = parser.parse(result.markdown);

      expect(merged.frontmatter.name).toBe('New Name');
      expect(merged.frontmatter.clayId).toBe(456);
      expect(merged.frontmatter.status).toBe('inactive');
      expect(merged.frontmatter.email).toEqual(['new@example.com']);
    });

    it('should handle contact name changes (clayId is source of truth)', () => {
      const existing = parser.parse(`---
name: Harry Oppenheim
clayId: 12345
status: active
email:
  - harry@old.com
---

## Links

Links

## Notes

User notes`);

      const fresh = parser.parse(`---
name: Henry Oppenheim-Smith
clayId: 12345
status: active
email:
  - henry@new.com
---

## Links

New links

## Work History

Work data`);

      const result = merger.merge(existing, fresh);
      const merged = parser.parse(result.markdown);

      // Name should update to fresh data
      expect(merged.frontmatter.name).toBe('Henry Oppenheim-Smith');
      // clayId should remain same (identity marker)
      expect(merged.frontmatter.clayId).toBe(12345);
      // Email should update
      expect(merged.frontmatter.email).toEqual(['henry@new.com']);
      // Notes should be preserved (from existing system sections, but user-managed)
      expect(merged.systemSections.some(s => s.heading === 'Notes' && s.content.includes('User notes'))).toBe(true);
    });

    it('should update bio from fresh Clay data (LinkedIn changes)', () => {
      const existing = parser.parse(`---
name: Test User
clayId: 123
bio: Old bio from LinkedIn
---

## Notes

User notes`);

      const fresh = parser.parse(`---
name: Test User
clayId: 123
bio: Updated bio from LinkedIn - now working on new initiative
---

## Links

Links`);

      const result = merger.merge(existing, fresh);
      const merged = parser.parse(result.markdown);

      // Bio should be updated (Clay-managed field)
      expect(merged.frontmatter.bio).toBe('Updated bio from LinkedIn - now working on new initiative');
    });

    it('should preserve user-managed frontmatter fields', () => {
      const existing = parser.parse(`---
name: Test
clayId: 123
priority: high
nextFollowup: "2025-02-15"
---

## Notes

Notes`);

      const fresh = parser.parse(`---
name: Test
clayId: 123
priority: low
---

## Links

Links`);

      const result = merger.merge(existing, fresh);
      const merged = parser.parse(result.markdown);

      // User-managed field should be preserved
      expect(merged.frontmatter.priority).toBe('high');
      expect(merged.frontmatter.nextFollowup).toBeDefined();
    });

    it('should preserve user-added custom fields', () => {
      const existing = parser.parse(`---
name: Test
clayId: 123
customField: customValue
---

## Notes

Notes`);

      const fresh = parser.parse(`---
name: Test
clayId: 123
---

## Links

Links`);

      const result = merger.merge(existing, fresh);
      const merged = parser.parse(result.markdown);

      expect(merged.frontmatter.customField).toBe('customValue');
    });
  });

  describe('merge - system sections', () => {
    it('should replace system sections with fresh data', () => {
      const existing = parser.parse(`---
name: Test
---

## Work History

Old job

## Links

Old links`);

      const fresh = parser.parse(`---
name: Test
---

## Work History

New job

## Links

New links`);

      const result = merger.merge(existing, fresh);
      const merged = parser.parse(result.markdown);

      const workSection = merged.systemSections.find(s => s.heading === 'Work History');
      expect(workSection?.content).toContain('New job');
      expect(workSection?.content).not.toContain('Old job');
    });

    it('should handle missing system sections in fresh data', () => {
      const existing = parser.parse(`---
name: Test
---

## Links

Links`);

      const fresh = parser.parse(`---
name: Test
---

## Work History

New job`);

      const result = merger.merge(existing, fresh);
      const merged = parser.parse(result.markdown);

      // Should have Work History from fresh, but not Links (unless in fresh)
      expect(merged.systemSections.map(s => s.heading)).toContain('Work History');
    });
  });

  describe('merge - user sections preservation', () => {
    it('should preserve user sections exactly', () => {
      const existing = parser.parse(`---
name: Test
---

## Notes

User wrote this important note
With multiple lines

## Custom Section

Custom data to preserve`);

      const fresh = parser.parse(`---
name: Test
---

## Links

Fresh links

## Notes

Fresh template notes`);

      const result = merger.merge(existing, fresh);
      const merged = parser.parse(result.markdown);

      // Notes should be preserved from existing (system section but user-managed)
      const notes = merged.systemSections.find(s => s.heading === 'Notes');
      expect(notes?.content).toContain('User wrote this important note');
      expect(notes?.content).toContain('With multiple lines');

      // Custom user sections should also be preserved
      const custom = merged.userSections.find(s => s.heading === 'Custom Section');
      expect(custom?.content).toContain('Custom data to preserve');
    });

    it('should preserve user sections that do not exist in fresh data', () => {
      const existing = parser.parse(`---
name: Test
---

## Custom Section

Custom content`);

      const fresh = parser.parse(`---
name: Test
---

## Links

Links

## Notes

Fresh notes`);

      const result = merger.merge(existing, fresh);
      const merged = parser.parse(result.markdown);

      const headings = merged.userSections.map(s => s.heading);
      expect(headings).toContain('Custom Section');
    });
  });

  describe('merge - date entries preservation', () => {
    it('should preserve date entries', () => {
      const existing = parser.parse(`---
name: Test
---

#### 2025-01-20

Talked to them today

#### 2025-01-15

Previous note`);

      const fresh = parser.parse(`---
name: Test
---

## Links

Fresh links`);

      const result = merger.merge(existing, fresh);
      const merged = parser.parse(result.markdown);

      expect(merged.dateEntries).toHaveLength(2);
      expect(merged.dateEntries.map(d => d.date)).toContain('2025-01-20');
      expect(merged.dateEntries.map(d => d.date)).toContain('2025-01-15');
    });

    it('should sort date entries in descending order', () => {
      const existing = parser.parse(`---
name: Test
---

#### 2025-01-15

First

#### 2025-01-20

Second

#### 2025-01-10

Third`);

      const fresh = parser.parse(`---
name: Test
---

## Links

Links`);

      const result = merger.merge(existing, fresh);
      const merged = parser.parse(result.markdown);

      // Check markdown directly to verify order
      expect(result.markdown).toMatch(/2025-01-20.*2025-01-15.*2025-01-10/s);
    });
  });

  describe('merge - output structure', () => {
    it('should assemble markdown in correct order: frontmatter, links, separator, notes, dates, separator, clay sections', () => {
      const existing = parser.parse(`---
name: Test
clayId: 123
---

## Notes

User notes

#### 2025-01-20

Date entry`);

      const fresh = parser.parse(`---
name: Test
clayId: 123
---

## Links

Links content

## Work History

Work content`);

      const result = merger.merge(existing, fresh);

      // Verify structure
      const lines = result.markdown.split('\n');

      // Should start with frontmatter
      expect(lines[0]).toBe('---');

      // Find separators
      const yamlEnd = lines.findIndex((l, i) => i > 0 && l === '---');
      const separators = lines
        .map((l, i) => (l === '---' ? i : -1))
        .filter(i => i > yamlEnd + 1);

      expect(yamlEnd).toBeGreaterThan(0);
      expect(separators.length).toBeGreaterThanOrEqual(2);

      const sep1 = separators[0]; // After links
      const sep2 = separators[1]; // After notes/dates

      // Links should come before first separator
      const linksIndex = lines.findIndex(l => l.includes('## Links'));
      expect(linksIndex).toBeLessThan(sep1);

      // Notes should come between separators
      const notesIndex = lines.findIndex(l => l.includes('## Notes'));
      expect(notesIndex).toBeGreaterThan(sep1);
      expect(notesIndex).toBeLessThan(sep2);

      // Work History should come after second separator
      const workIndex = lines.findIndex(l => l.includes('## Work History'));
      expect(workIndex).toBeGreaterThan(sep2);
    });

    it('should return merge metadata', () => {
      const existing = parser.parse(`---
name: Test
---

## Notes

Notes

## Family Notes

Family notes

#### 2025-01-20

Date 1

#### 2025-01-15

Date 2`);

      const fresh = parser.parse(`---
name: Test
---

## Links

Links

## Work History

Work`);

      const result = merger.merge(existing, fresh);

      expect(result.preservedSections).toContain('Notes');
      expect(result.preservedDateEntries).toBe(2);
      expect(result.updatedSections).toContain('Links');
      expect(result.updatedSections).toContain('Work History');
    });
  });

  describe('merge - integration test', () => {
    it('should perform complete merge of real-world scenario', () => {
      const existing = parser.parse(`---
name: John Doe
clayId: 123
status: active
title: Software Engineer
organization: Tech Corp
priority: high
nextFollowup: "2025-02-15"
---

## Links

[john@example.com](mailto:john@example.com)

## Notes

User notes from previous sync
#important

## Family Notes

Married with 2 kids

#### 2025-01-20

Had great conversation about AI

#### 2025-01-15

Met at conference`);

      const fresh = parser.parse(`---
name: John Doe
clayId: 123
status: active
title: Senior Engineer
organization: Tech Corp 2.0
email:
  - john@techcorp.com
relationshipScore: 85
---

## Links

[john@techcorp.com](mailto:john@techcorp.com)

## Work History

- Senior Engineer @ Tech Corp 2.0 (current)
- Software Engineer @ StartUp (2020-2023)

## Interaction History

Last contact: 2025-01-20`);

      const result = merger.merge(existing, fresh);
      const merged = parser.parse(result.markdown);

      // Fresh data should be used
      expect(merged.frontmatter.title).toBe('Senior Engineer');
      expect(merged.frontmatter.organization).toBe('Tech Corp 2.0');
      expect(merged.frontmatter.relationshipScore).toBe(85);

      // User data should be preserved
      expect(merged.frontmatter.priority).toBe('high');
      expect(merged.frontmatter.nextFollowup).toBeDefined();

      // Notes section should be preserved (not replaced with fresh)
      const notesSection = merged.systemSections.find(s => s.heading === 'Notes');
      expect(notesSection?.content).toContain('User notes from previous sync');
      expect(notesSection?.content).toContain('#important');

      // Date entries should be preserved
      expect(merged.dateEntries).toHaveLength(2);

      // Metadata should be correct
      expect(result.preservedSections).toContain('Notes');
      expect(result.preservedDateEntries).toBe(2);
    });
  });
});
