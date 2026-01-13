/**
 * Clay Local MCP Client - wrapper for clay-mcp tool calls
 * Communicates with clay-mcp configured in Claude Desktop
 */

import type { ClayContact } from '../models/clay-contact';
import type {
  ClayLocalSearchParams,
  ClayLocalGetContactParams,
  ClayLocalSearchResult
} from './types';

export class ClayLocalMCPClient {
  private mcpName: string = 'clay-mcp';

  /**
   * Search for contacts in Clay by query
   * Uses clay-mcp:searchContacts tool
   */
  async searchContacts(params: ClayLocalSearchParams): Promise<ClayLocalSearchResult> {
    // For Phase 1D: This will connect to the actual clay-mcp tool
    // Currently returns helpful error message

    throw new Error(
      `MCP integration not yet implemented. To use real Clay data:\n` +
      `1. Ensure clay-mcp is configured in Claude Desktop\n` +
      `2. Use Claude Code with Tend as an MCP tool\n` +
      `3. Or implement stdio-based MCP communication\n\n` +
      `For now, use fixtures: tend sync --fixture sample`
    );
  }

  /**
   * Get full contact details by ID
   * Uses clay-mcp:getContact tool
   */
  async getContact(contactId: number): Promise<ClayContact> {
    // For Phase 1D: This will connect to the actual clay-mcp tool
    // Currently returns helpful error message

    throw new Error(
      `MCP integration not yet implemented. To use real Clay data:\n` +
      `1. Ensure clay-mcp is configured in Claude Desktop\n` +
      `2. Use Claude Code with Tend as an MCP tool\n` +
      `3. Or implement stdio-based MCP communication\n\n` +
      `For now, use fixtures: tend sync --fixture sample`
    );
  }

  /**
   * Get MCP name for logging/debugging
   */
  getMCPName(): string {
    return this.mcpName;
  }
}

/**
 * Note on MCP Implementation:
 *
 * The Model Context Protocol (MCP) allows tools to communicate through stdio with JSON-RPC.
 * Clay's MCP is configured in Claude Desktop with the name "clay-mcp".
 *
 * To fully implement this, we would need:
 *
 * Option A: Use as Claude Code MCP Tool
 * - Make Tend itself an MCP tool in Claude Desktop
 * - Call it: tend:sync with contact names
 * - Would run within Claude's MCP infrastructure
 *
 * Option B: Direct stdio communication
 * - Spawn the MCP process directly
 * - Communicate via JSON-RPC over stdin/stdout
 * - Requires knowing the exact command to start the MCP
 *
 * Option C: Via Anthropic SDK
 * - Use Anthropic's official SDK with MCP support
 * - Requires authentication and MCP registration
 *
 * For Phase 1D MVP, Option A is recommended:
 * Create a tend.mcp.json in Claude Desktop config, then:
 * tend sync --name "Contact Name" will work through Claude Code
 */
