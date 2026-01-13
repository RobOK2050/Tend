#!/bin/bash

# Search and Sync Script - Orchestrate Clay search + Tend sync
# Usage: ./scripts/search-and-sync.sh "Contact Name"
#
# What it does:
# 1. Shows how to search Clay using clay-mcp
# 2. Then syncs that contact to Obsidian using Tend
#
# For automation, use with Claude Code which can call both MCPs

CONTACT_NAME="${1:-}"

if [ -z "$CONTACT_NAME" ]; then
  echo "Usage: $0 \"Contact Name\""
  echo ""
  echo "Examples:"
  echo "  $0 \"Harry Oppenheim\""
  echo "  $0 \"Jane Doe\""
  exit 1
fi

echo "🔍 Searching for: $CONTACT_NAME"
echo ""
echo "Step 1: Search Clay via MCP"
echo "  Command to run in Claude Code:"
echo "  clay-mcp:searchContacts { query: \"$CONTACT_NAME\", limit: 1 }"
echo ""
echo "Step 2: Get contact details"
echo "  Once you have the contact ID from Step 1, run:"
echo "  clay-mcp:getContact { contact_id: <ID> }"
echo ""
echo "Step 3: Sync to Obsidian"
echo "  Once you have contact data from Step 2, run:"
echo "  npm run build && node dist/index.js sync"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "🤖 Using Claude Code:"
echo ""
echo "For a fully automated workflow, use this in Claude Code:"
echo ""
echo "1. Search Clay:"
echo "   clay-mcp:searchContacts { query: \"$CONTACT_NAME\" }"
echo ""
echo "2. Get full contact (replace ID with actual):"
echo "   clay-mcp:getContact { contact_id: 12345 }"
echo ""
echo "3. Then run Tend (it will use the default fixture for now):"
echo "   npm run build && node dist/index.js sync"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Current workaround: Use fixture data"
echo "  node dist/index.js sync --fixture sample --verbose"
