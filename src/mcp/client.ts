/**
 * MCP Client Factory - creates and manages MCP clients with strategy pattern
 * Supports multiple MCP implementations (Official cloud, Local stdio)
 */

import { ClayLocalMCPClient } from './clay-local';
import { ClayOfficialMCPClient } from './clay-official';

export type MCPStrategy = 'official' | 'local';

export interface MCPConfig {
  enabled: boolean;
  name: string;
}

export interface MCPClientConfig {
  clayOfficial?: MCPConfig;
  clayLocal?: MCPConfig;
  default?: MCPStrategy;
}

/**
 * Union type for both MCP clients
 * Allows code to work with either implementation
 */
export type ClayMCPClient = ClayOfficialMCPClient | ClayLocalMCPClient;

export class MCPClientFactory {
  /**
   * Create appropriate MCP client based on strategy
   * Defaults to 'official' for cloud-based access
   */
  static createClient(strategy: MCPStrategy = 'official'): ClayMCPClient {
    if (strategy === 'official') {
      return new ClayOfficialMCPClient();
    } else if (strategy === 'local') {
      return new ClayLocalMCPClient();
    }
    throw new Error(`Unknown MCP strategy: ${strategy}`);
  }

  /**
   * Create a Clay Official MCP client (cloud-based)
   */
  static createClayOfficialClient(): ClayOfficialMCPClient {
    return new ClayOfficialMCPClient();
  }

  /**
   * Create a Clay Local MCP client (local stdio)
   */
  static createClayLocalClient(): ClayLocalMCPClient {
    return new ClayLocalMCPClient();
  }

  /**
   * Validate MCP configuration
   */
  static validateConfig(config: MCPClientConfig): boolean {
    const strategy = config.default || 'official';
    if (strategy === 'official') {
      return !config.clayOfficial || config.clayOfficial.enabled !== false;
    } else if (strategy === 'local') {
      return !config.clayLocal || config.clayLocal.enabled !== false;
    }
    return false;
  }

  /**
   * Get recommended strategy based on environment
   * For now, official is recommended for cloud access
   */
  static getRecommendedStrategy(): MCPStrategy {
    return 'official';
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
