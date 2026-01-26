/**
 * Unit tests for MarkdownParser
 */

import { MarkdownParser } from '../markdown-parser';

describe('MarkdownParser', () => {
  let parser: MarkdownParser;

  beforeEach(() => {
    parser = new MarkdownParser();
  });

  describe('parse - basic parsing', () => {
    it('should parse frontmatter with gray-matter', () => {
      const markdown = `---
name: John Doe
clayId: 123
status: active
---

## Notes

User notes here`;

      const result = parser.parse(markdown);

      expect(result.frontmatter.name).toBe('John Doe');
      expect(result.frontmatter.clayId).toBe(123);
      expect(result.frontmatter.status).toBe('active');
    });

    it('should handle empty frontmatter', () => {
      const markdown = `---
---

## Notes

Content`;

      const result = parser.parse(markdown);

      expect(result.frontmatter).toBeDefined();
      expect(result.frontmatter.name).toBe('Unknown');
    });

    it('should split body into sections', () => {
      const markdown = `---
name: Test
---

## Notes

Note content

## Work History

Work content`;

      const result = parser.parse(markdown);

      // Notes is in systemSections (system-managed but user-editable)
      // Work History is also in systemSections
      expect(result.systemSections).toHaveLength(2);
      expect(result.systemSections[0].heading).toBe('Notes');
      expect(result.systemSections[1].heading).toBe('Work History');

      expect(result.userSections).toHaveLength(0);
    });
  });

  describe('parse - section categorization', () => {
    it('should categorize system sections', () => {
      const markdown = `---
name: Test
---

## Links

Link content

## Work History

Work content

## Education

Edu content`;

      const result = parser.parse(markdown);

      const headings = result.systemSections.map(s => s.heading);
      expect(headings).toContain('Links');
      expect(headings).toContain('Work History');
      expect(headings).toContain('Education');
    });

    it('should categorize user sections', () => {
      const markdown = `---
name: Test
---

## Notes

Note content

## Family Notes

Family note content`;

      const result = parser.parse(markdown);

      // Notes is in systemSections (system-managed but user-editable)
      const noteSection = result.systemSections.find(s => s.heading === 'Notes');
      expect(noteSection?.heading).toBe('Notes');

      // Family Notes is in userSections
      const headings = result.userSections.map(s => s.heading);
      expect(headings).toContain('Family Notes');
    });

    it('should preserve unknown sections as user sections', () => {
      const markdown = `---
name: Test
---

## Custom Section

Custom content`;

      const result = parser.parse(markdown);

      expect(result.userSections).toHaveLength(1);
      expect(result.userSections[0].heading).toBe('Custom Section');
    });
  });

  describe('parse - date entries', () => {
    it('should detect date entries (####YYYY-MM-DD format)', () => {
      const markdown = `---
name: Test
---

#### 2025-01-20

Date entry content`;

      const result = parser.parse(markdown);

      expect(result.dateEntries).toHaveLength(1);
      expect(result.dateEntries[0].date).toBe('2025-01-20');
      expect(result.dateEntries[0].content).toBe('Date entry content');
    });

    it('should handle multiple date entries', () => {
      const markdown = `---
name: Test
---

#### 2025-01-20

First date entry

#### 2025-01-15

Second date entry`;

      const result = parser.parse(markdown);

      expect(result.dateEntries).toHaveLength(2);
      expect(result.dateEntries[0].date).toBe('2025-01-20');
      expect(result.dateEntries[1].date).toBe('2025-01-15');
    });

    it('should not treat non-date headers as date entries', () => {
      const markdown = `---
name: Test
---

#### Not A Date

Content

#### 2025-01-20

Date entry`;

      const result = parser.parse(markdown);

      expect(result.dateEntries).toHaveLength(1);
      expect(result.dateEntries[0].date).toBe('2025-01-20');
      expect(result.userSections).toHaveLength(1);
      expect(result.userSections[0].heading).toBe('Not A Date');
    });
  });

  describe('parse - section content preservation', () => {
    it('should preserve section content exactly', () => {
      const markdown = `---
name: Test
---

## Notes

Line 1
Line 2
Line 3`;

      const result = parser.parse(markdown);

      // Notes is in systemSections, not userSections
      const notesSection = result.systemSections.find(s => s.heading === 'Notes');
      expect(notesSection?.content).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should handle multiline content with blank lines', () => {
      const markdown = `---
name: Test
---

## Notes

Paragraph 1

Paragraph 2`;

      const result = parser.parse(markdown);

      // Notes is in systemSections, not userSections
      const notesSection = result.systemSections.find(s => s.heading === 'Notes');
      expect(notesSection?.content).toContain('Paragraph 1');
      expect(notesSection?.content).toContain('Paragraph 2');
    });

    it('should trim leading and trailing whitespace from section content', () => {
      const markdown = `---
name: Test
---

## Notes


Content with surrounding whitespace
   `;

      const result = parser.parse(markdown);

      // Notes is in systemSections, not userSections
      const notesSection = result.systemSections.find(s => s.heading === 'Notes');
      const content = notesSection?.content || '';
      expect(content).not.toMatch(/^   /);
      expect(content).not.toMatch(/   $/);
      expect(content).toContain('Content with surrounding whitespace');
    });
  });

  describe('parse - section levels', () => {
    it('should preserve heading levels (## vs ###)', () => {
      const markdown = `---
name: Test
---

## Level 2

Content

### Level 3

Content`;

      const result = parser.parse(markdown);

      const level2 = result.userSections.find(s => s.heading === 'Level 2');
      const level3 = result.userSections.find(s => s.heading === 'Level 3');

      expect(level2?.level).toBe(2);
      expect(level3?.level).toBe(3);
    });

    it('should detect level 4 headings for date entries', () => {
      const markdown = `---
name: Test
---

#### 2025-01-20

Content`;

      const result = parser.parse(markdown);

      expect(result.dateEntries[0].level).toBe(4);
    });
  });

  describe('parse - edge cases', () => {
    it('should handle files with no body sections', () => {
      const markdown = `---
name: Test
clayId: 123
---`;

      const result = parser.parse(markdown);

      expect(result.systemSections).toHaveLength(0);
      expect(result.userSections).toHaveLength(0);
      expect(result.dateEntries).toHaveLength(0);
    });

    it('should handle malformed markdown gracefully', () => {
      const markdown = `Some random content without frontmatter

## Notes

Content`;

      // Should not throw
      const result = parser.parse(markdown);

      expect(result).toBeDefined();
      expect(result.frontmatter).toBeDefined();
    });

    it('should handle section headers with special characters', () => {
      const markdown = `---
name: Test
---

## Notes (Archived)

Content

## Family Notes: Important

Content`;

      const result = parser.parse(markdown);

      const headings = result.userSections.map(s => s.heading);
      expect(headings).toContain('Notes (Archived)');
      expect(headings).toContain('Family Notes: Important');
    });
  });

  describe('parse - clayId field (contact identity)', () => {
    it('should preserve clayId as contact identifier', () => {
      const markdown = `---
name: Old Name
clayId: 12345
status: active
---

## Notes

Content`;

      const result = parser.parse(markdown);

      // clayId is the source of truth for contact identity
      expect(result.frontmatter.clayId).toBe(12345);
    });

    it('should handle clayId correctly when name changes', () => {
      const oldMarkdown = `---
name: Harry Oppenheim
clayId: 12345
---

## Notes

User notes`;

      const result = parser.parse(oldMarkdown);

      // Even if name changes in fresh data, clayId stays same
      expect(result.frontmatter.clayId).toBe(12345);
    });
  });

  describe('parse - frontmatter fields', () => {
    it('should preserve all frontmatter fields', () => {
      const markdown = `---
name: John Doe
clayId: 123
status: active
priority: high
birthday: "1990-05-15"
interests:
  - reading
  - travel
customField: customValue
---

## Notes

Content`;

      const result = parser.parse(markdown);

      expect(result.frontmatter.name).toBe('John Doe');
      expect(result.frontmatter.clayId).toBe(123);
      expect(result.frontmatter.priority).toBe('high');
      // Note: YAML parser converts dates to Date objects, so we check the value exists
      expect(result.frontmatter.birthday).toBeDefined();
      expect(result.frontmatter.interests).toEqual(['reading', 'travel']);
      expect(result.frontmatter.customField).toBe('customValue');
    });
  });
});
