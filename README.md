# Tend - Personal CRM for Obsidian

Sync contact data from Clay.earth to your Obsidian vault as beautiful markdown files.

## Status

🚀 **Phase 1C Complete** - Core functionality working with fixture data

| Feature | Status | Notes |
|---------|--------|-------|
| Markdown generation | ✅ | Compact, AI-friendly format |
| CLI interface | ✅ | Full command structure |
| File operations | ✅ | Write to Obsidian vault |
| MCP framework | ✅ | Ready for integration |
| Real Clay sync | ⏳ | Fixtures work, MCP pending |

## Quick Start

### 1. Build

```bash
cd /Users/Woodmont/projects/tend
npm install
npm run build
```

### 2. Test with Sample Data

```bash
node dist/index.js sync --verbose
```

This creates a markdown file in your Obsidian vault with all sections ready.

### 3. View Output

```bash
cat "/Users/Woodmont/Documents/Thoughts in Time/40 Connections/Harry Oppenheim.md"
```

## Commands

```bash
# Sync with sample data (default)
node dist/index.js sync

# Verbose output
node dist/index.js sync --verbose

# Preview without writing (dry run)
node dist/index.js sync --dry-run --verbose

# Custom vault path
node dist/index.js sync --vault /path/to/vault

# Search and sync (when MCP ready)
node dist/index.js sync --name "Contact Name"
```

## Using with Claude Code

See [CLAUDE_CODE_WORKFLOW.md](CLAUDE_CODE_WORKFLOW.md) for detailed integration guide.

**Quick example:**

```bash
# From Claude Code, build and sync in one command:
cd /Users/Woodmont/projects/tend && npm run build && node dist/index.js sync --verbose
```

## Markdown Format

Generated files have this structure:

```markdown
---
# YAML Frontmatter (queryable metadata)
name: Harry Oppenheim
email: [emails]
phone: [phones]
tags: [tags]
relationshipScore: 95
interactions: {first, last, counts}
...
---

## Links
[[Obsidian Wikilinks]]

## Contact Details
| Field | Value |
|-------|-------|
| Email | ... |
| Phone | ... |
| Role  | ... |

## Work History
- CEO @ Arc Aspicio (current)
- Senior Advisor @ Federal Government [2012-2017]

## Education
- Stanford University - MBA [2008-2010]

## Interaction History
**Relationship Score:** 95/100

## Clay Notes
- Notes from Clay synced here

---

## Notes
[Your personal notes - preserved on updates]

## Family Notes
[Family info - spouse, kids, pets, etc.]
```

**System Sections** (regenerated on sync):
- Links
- Contact Details
- Work History
- Education
- Interaction History
- Clay Notes

**User Sections** (never overwritten):
- Notes
- Family Notes

## Architecture

```
Clay MCPs
    ↓
ContactMapper (Clay → Tend)
    ↓
TemplateEngine (Tend → Markdown)
    ↓
FileManager (Write to Vault)
    ↓
Obsidian Files
```

## Project Structure

```
tend/
├── src/
│   ├── index.ts                 # CLI entry point
│   ├── models/                  # Data types
│   ├── mappers/                 # Clay → Tend transformation
│   ├── templates/               # Markdown generation
│   ├── vault/                   # File operations
│   ├── commands/                # CLI commands
│   ├── mcp/                     # MCP integration
│   └── utils/                   # Helpers
├── fixtures/                    # Sample data for testing
├── scripts/                     # Helper scripts
├── CLAUDE_CODE_WORKFLOW.md      # Integration guide
├── MCP_INTEGRATION.md           # MCP details
└── README.md                    # This file
```

## Development Scripts

```bash
# Build TypeScript
npm run build

# Test mapper with fixtures
npm run dev:mapper

# Test template generation
npm run dev:template

# Run linter
npm run lint

# Format code
npm run format
```

## Phases

### Phase 1A ✅ - Data Models
- Clay and Tend contact models
- Contact mapper with fixture data

### Phase 1B ✅ - Markdown Generation
- Compact table-based format
- YAML frontmatter with metadata
- System and user sections

### Phase 1C ✅ - File Operations & CLI
- Vault file manager
- CLI interface with commander.js
- File writing and overwrite logic

### Phase 1D ✅ - MCP Framework
- MCP client structure
- Error handling with guidance
- Ready for integration

### Phase 1E ⏳ - Batch Processing
- Input file support
- Structured logging
- Progress reporting

### Phase 1F ⏳ - Parser & Merge
- Markdown parser
- Intelligent merge (preserve user sections)
- Date entry preservation

### Phase 2 ⏳ - Official MCP + UnBrain
- Add Clay Official MCP support
- TheBrain integration (modular)
- Advanced query features

## Configuration

Default vault path:
```
/Users/Woodmont/Documents/Thoughts in Time/40 Connections
```

Override with `--vault` flag or edit in config file (coming in Phase 1E).

## MCP Integration Status

**Current:** Fixture mode works perfectly
**Pending:** Direct clay-mcp communication

See [MCP_INTEGRATION.md](MCP_INTEGRATION.md) for 4 implementation approaches.

## Example: Syncing a Contact

**Phase 1 (Today):**
```bash
npm run build
node dist/index.js sync --verbose
# Creates: Harry Oppenheim.md with sample data
```

**Phase 1D (When MCP Ready):**
```bash
node dist/index.js sync --name "Harry Oppenheim" --verbose
# Searches Clay, fetches real data, writes to vault
```

**Phase 1E (Batch Processing):**
```bash
# batch.txt contains: Harry Oppenheim, Jane Doe, etc.
node dist/index.js sync --input batch.txt --verbose
# Syncs all contacts from file
```

## Features Implemented

- ✅ Compact markdown format
- ✅ YAML frontmatter with rich metadata
- ✅ System sections regenerated on sync
- ✅ User sections preserved (Notes, Family Notes)
- ✅ File management (create/overwrite)
- ✅ Filename sanitization
- ✅ Error handling
- ✅ Verbose logging
- ✅ Dry-run mode

## Features Coming

- ⏳ Real clay-mcp integration
- ⏳ Batch processing from file
- ⏳ Intelligent merge (preserve edits)
- ⏳ Date entry preservation
- ⏳ Official MCP support
- ⏳ TheBrain linking

## Contributing

This is a personal tool, but architecture is solid for extension.

Key files for enhancements:
- `src/mcp/clay-local.ts` - Add real MCP communication here
- `src/vault/parser.ts` - Implement for Phase 1F
- `src/templates/body-sections.ts` - Customize markdown format

## License

MIT

## Notes

- Local-only (no cloud sync)
- Plain text markdown (future-proof)
- Obsidian-compatible
- Git-friendly
- AI-friendly YAML structure

## Getting Help

### See also:
- [CLAUDE_CODE_WORKFLOW.md](CLAUDE_CODE_WORKFLOW.md) - Using with Claude Code
- [MCP_INTEGRATION.md](MCP_INTEGRATION.md) - MCP technical details

### Repository
GitHub: https://github.com/RobOK2050/Tend
