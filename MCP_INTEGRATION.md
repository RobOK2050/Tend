# MCP Integration for Tend

## Current Status (Phase 1D)

Tend is ready for MCP integration, but full stdio/HTTP communication with clay-mcp requires additional setup.

## What's Ready ✅

- ✅ CLI structure supports `--name` flag for searching Clay
- ✅ MCP client interfaces defined
- ✅ Error handling with helpful messages
- ✅ Fixture mode works perfectly for testing
- ✅ Code is structured for easy MCP integration

## What's Needed 🚀

To enable real Clay data syncing, choose one of these approaches:

### Option 1: Claude Code as Bridge (Recommended for Now)
**Approach:** Use Claude Code to call clay-mcp, which then calls Tend

```bash
# In Claude Code:
clay-mcp:searchContacts { query: "Harry Oppenheim" }
# Get the contact ID, then:
tend sync --fixture sample  # or implement direct call
```

**Pros:**
- Uses existing Claude Desktop MCP setup
- No code changes needed to clay-mcp
- Reliable communication

**Cons:**
- Manual step between search and sync
- Can't do it directly from CLI

### Option 2: Direct stdio Communication
**Approach:** Implement JSON-RPC over stdio to talk directly to clay-mcp

**Files to update:**
- `src/mcp/clay-local.ts` - Implement stdio communication
- `src/mcp/types.ts` - Add JSON-RPC handler

**Requires:**
- Knowing how to spawn and communicate with MCP process
- JSON-RPC request/response handling
- Error recovery for MCP crashes

### Option 3: HTTP Bridge
**Approach:** Create a simple HTTP server that bridges to clay-mcp

**Requires:**
- Separate HTTP service running
- Additional process management
- More complexity

### Option 4: Tend as MCP Tool
**Approach:** Register Tend itself as an MCP tool in Claude Desktop

**In `~/.config/Claude/claude_desktop_config.json`:**
```json
{
  "mcpServers": {
    "tend": {
      "command": "/path/to/tend",
      "args": ["mcp"]
    }
  }
}
```

**Then use in Claude Code:**
```
tend:sync --name "Harry Oppenheim"
```

**Pros:**
- Native integration with Claude Desktop
- Can use from Claude Code directly
- Clean abstraction

**Cons:**
- Requires MCP protocol implementation in Node.js
- More setup required

## Next Steps

1. **For testing:** Use `tend sync --fixture sample` with fixture data
2. **For real data:** Try Option 1 (Claude Code bridge)
3. **For production:** Implement Option 2 or 3 once approach is decided

## Test Commands

```bash
# Test with sample fixture (always works)
npm run build && node dist/index.js sync --verbose

# Try to use real Clay data (shows error with instructions)
node dist/index.js sync --name "Harry Oppenheim"

# Test dry-run
node dist/index.js sync --dry-run --verbose
```

## MCP Reference

**Clay Local MCP Name:** `clay-mcp`

**Available Tools:**
- `searchContacts(query, limit)` - Search by name or query
- `getContact(contact_id)` - Get full contact details

**Expected Response Format:**
```json
{
  "results": [
    {
      "id": 12345,
      "name": "Harry Oppenheim",
      "email": "...",
      ...
    }
  ]
}
```

## Implementation Notes

The architecture is designed to be agnostic to which communication method is chosen. Update `ClayLocalMCPClient` in `src/mcp/clay-local.ts` with your chosen approach, and the rest of Tend will work without changes.
