# Using Tend with Claude Code

## Quick Start: One-Command Search and Sync

You can use Claude Code to orchestrate searching Clay and syncing to Obsidian in one workflow.

### Workflow Steps

**In Claude Code, run these commands in sequence:**

```bash
# 1. Build Tend (one time)
cd /Users/Woodmont/projects/tend && npm run build

# 2. Run sync with sample data to test
node dist/index.js sync --fixture sample --verbose

# 3. Or run the search-sync script
npx ts-node src/bin/search-sync.ts "Harry Oppenheim"
```

---

## Full Orchestration with Clay Search

Once MCP integration is complete, the workflow will be:

### Method A: Using Clay MCP Directly

```bash
# In Claude Code, use the two MCPs:

# 1. Search Clay
clay-mcp:searchContacts { query: "Harry Oppenheim", limit: 1 }

# Response will include contact ID and basic info

# 2. Get full contact details
clay-mcp:getContact { contact_id: 12345 }

# 3. Sync to Obsidian (this will be automatic)
# Tend can be configured to watch for MCP responses
```

### Method B: Using Tend as MCP (Recommended Long-term)

Once Tend is registered as an MCP tool in Claude Desktop:

```bash
# Simple one-command sync:
tend:sync --name "Harry Oppenheim" --auto-search

# Or with explicit data:
tend:sync --name "Harry Oppenheim"
```

---

## Current Testing

### Option 1: Fixture Mode (Always Works)

```bash
node dist/index.js sync --verbose
# or
node dist/index.js sync --fixture sample --verbose
```

**Output:**
- Generates markdown from sample data
- Writes to: `/Users/Woodmont/Documents/Thoughts in Time/40 Connections/Harry Oppenheim.md`
- Perfect for testing the full pipeline

### Option 2: Batch File with Multiple Contacts

Create `batch-contacts.txt`:
```
Harry Oppenheim
Jane Doe
John Smith
```

Then (once input file mode is implemented in Phase 1E):
```bash
node dist/index.js sync --input batch-contacts.txt --verbose
```

---

## Integration Scenarios

### Scenario 1: Manual Search, Auto Sync

```
User: Search for Harry Oppenheim in Clay
Claude Code:
  - Call clay-mcp:searchContacts
  - Extract ID
  - Call clay-mcp:getContact
  - Call tend:sync with results
```

### Scenario 2: Batch Processing

```
User: Sync all Bitcoin contacts
Claude Code:
  - Call clay-mcp:searchContacts with filter
  - Loop through results
  - For each contact, call clay-mcp:getContact
  - Call tend:sync for each
```

### Scenario 3: Smart Updates

```
User: Sync Harry Oppenheim (already exists in vault)
Claude Code:
  - Search and fetch latest data
  - Call tend:sync
  - Tend preserves your Notes and Family Notes
  - Updates all system sections
```

---

## Claude Code Script Template

Here's a template you can use:

```bash
#!/bin/bash

# Build Tend (if needed)
cd /Users/Woodmont/projects/tend
npm run build

# Sync sample contact (for testing)
node dist/index.js sync --verbose

# Or sync with custom name (when MCP is ready)
# node dist/index.js sync --name "Contact Name" --verbose

echo "✓ Sync complete"
echo "Check vault at: /Users/Woodmont/Documents/Thoughts\ in\ Time/40\ Connections/"
```

---

## Debugging

### Check what was synced:
```bash
# List files modified in last hour
ls -lht "/Users/Woodmont/Documents/Thoughts in Time/40 Connections/" | head -5
```

### View the generated markdown:
```bash
cat "/Users/Woodmont/Documents/Thoughts in Time/40 Connections/Harry Oppenheim.md"
```

### Test dry-run (no files written):
```bash
node dist/index.js sync --dry-run --verbose
```

---

## Next Steps

1. **For now:** Use `node dist/index.js sync --verbose` to test with sample data
2. **Phase 1E:** Input file support for batch processing
3. **Phase 1F:** Intelligent merge to preserve user notes
4. **Phase 2:** Real MCP integration for live Clay data

## Commands Reference

```bash
# Basic sync (uses sample fixture)
npm run build && node dist/index.js sync

# Verbose output
npm run build && node dist/index.js sync --verbose

# Dry run (preview only)
npm run build && node dist/index.js sync --dry-run --verbose

# Custom vault (if needed)
npm run build && node dist/index.js sync --vault /path/to/vault
```

## MCP Configuration (Coming Soon)

Once MCP is fully integrated, Tend will appear in Claude Desktop as:

```
{
  "mcpServers": {
    "tend": {
      "command": "/path/to/tend",
      "args": ["mcp"]
    }
  }
}
```

Then you can use directly in Claude Code:
```
tend:sync --name "Contact Name"
```
