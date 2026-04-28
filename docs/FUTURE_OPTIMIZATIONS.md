# Future Optimizations

This document tracks potential optimizations identified during code review (2026-01-28) that were deferred for later implementation.

---

## Direct ParsedMarkdown Construction (High Impact, Deferred)

### Problem
Currently, for every merge operation:
1. Fresh markdown is generated from `TendContact` via `TemplateEngine.generateMarkdown()`
2. That string is immediately re-parsed via `MarkdownParser.parse()`

This serialization → deserialization round-trip is wasteful.

### Current Flow (file-manager.ts:163, 191)
```typescript
const freshMarkdown = this.templateEngine.generateMarkdown(contact);
// ... later ...
const freshParsed = this.parser.parse(freshMarkdown);
```

### Proposed Solution
Create a new method that builds `ParsedMarkdown` directly from `TendContact`:

```typescript
// In template-engine.ts or a new file
buildParsedFromContact(contact: TendContact): ParsedMarkdown {
  return {
    frontmatter: this.frontmatterGenerator.generateFrontmatter(contact),
    systemSections: [
      { heading: 'Links', level: 2, content: this.generateLinksContent(contact), systemManaged: true },
      { heading: 'Notes', level: 2, content: this.generateNotesContent(contact), systemManaged: true },
      { heading: 'Work History', level: 2, content: this.generateWorkHistoryContent(contact), systemManaged: true },
      // ... etc
    ],
    userSections: [], // Fresh contacts have no user sections
    dateEntries: [],  // Fresh contacts have no date entries
    rawContent: ''    // Not needed for merge
  };
}
```

### Files to Modify
- `src/templates/template-engine.ts` - Add `buildParsedFromContact()` method
- `src/templates/body-sections.ts` - Refactor to expose content-only generators
- `src/vault/file-manager.ts` - Use new method instead of generate + parse

### Benefits
- Eliminates string parsing overhead (~10-20ms per contact)
- Reduces memory allocations (no intermediate string)
- Cleaner separation of concerns

### Complexity
- Medium - Requires refactoring body-sections.ts to separate section heading generation from content generation
- Need to ensure frontmatter object matches what gray-matter produces

### When to Implement
- When merge performance becomes a bottleneck
- When processing very large batches (10,000+ contacts)
- After current optimizations prove insufficient

---

## Other Potential Optimizations (Lower Priority)

### Parallel File Processing
Currently contacts are processed sequentially. For CPU-bound operations, could use worker threads or process pool.

**Trade-offs:** Adds complexity, may cause file system contention

### Incremental Cache Flush
Instead of single flush at end, flush every N contacts as safety net.

**Status:** User chose single flush at end (Option A) - simpler and sufficient for current use case.

### Content Hash for Skip Detection
Currently using string comparison for unchanged detection. Could pre-compute hash for faster comparison.

**Trade-offs:** Hash computation overhead may exceed string comparison for typical file sizes (~5KB)

---

*Last updated: 2026-01-28*
