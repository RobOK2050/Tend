/**
 * MCP Client Factory - creates and manages MCP clients
 */

import { ClayLocalMCPClient } from './clay-local';

export interface MCPConfig {
  enabled: boolean;
  name: string;
}

export interface MCPClientConfig {
  clayLocal: MCPConfig;
}

export class MCPClientFactory {
  /**
   * Create a Clay Local MCP client
   */
  static createClayLocalClient(): ClayLocalMCPClient {
    return new ClayLocalMCPClient();
  }

  /**
   * Validate MCP configuration
   */
  static validateConfig(config: MCPClientConfig): boolean {
    return config.clayLocal && config.clayLocal.enabled;
  }
}

/**
 * Note: Full MCP integration is deferred to later phase
 *
 * Current status:
 * - clay-mcp is configured in Claude Desktop ✓
 * - Tend CLI is ready to use MCP tools ✓
 * - Communication protocol needs implementation
 *
 * Next steps:
 * 1. Test with Claude Code as intermediary
 * 2. Implement direct stdio communication to clay-mcp
 * 3. Or register Tend as MCP tool in Claude Desktop config
 *
 * Workaround for Phase 1D testing:
 * - Use Claude Code to call Tend CLI
 * - Example: Run "tend sync --fixture sample" to test
 * - Once working, move to real MCP calls
 */
