/**
 * Clay Local MCP Client - Direct subprocess communication with clay-mcp
 * Spawns @clayhq/clay-mcp@latest and communicates via stdio JSON-RPC
 */

import { spawn, ChildProcess } from 'child_process';
import type { ClayContact } from '../models/clay-contact';
import type {
  ClayLocalSearchParams,
  ClayLocalGetContactParams,
  ClayLocalSearchResult,
  MCPRequest,
  MCPResponse
} from './types';

export class ClayLocalMCPClient {
  private mcpName: string = 'clay-mcp';
  private process?: ChildProcess;
  private requestId: number = 0;
  private apiKey?: string;
  private pendingRequests: Map<number, { resolve: (data: any) => void; reject: (error: Error) => void }> = new Map();

  constructor(apiKey?: string) {
    // Get API key from parameter, environment, or throw error
    this.apiKey = apiKey || process.env.CLAY_API_KEY;

    if (!this.apiKey) {
      throw new Error(
        'Clay API key not found. Please provide one of:\n' +
        '1. Pass to constructor: new ClayLocalMCPClient("key")\n' +
        '2. Set CLAY_API_KEY environment variable\n' +
        '3. Get your API key from Clay.earth account settings'
      );
    }
  }

  /**
   * Ensure the MCP process is running and connected
   */
  private async ensureConnected(): Promise<void> {
    if (this.process) {
      return;
    }

    this.process = spawn('npx', ['@clayhq/clay-mcp@latest'], {
      env: {
        ...process.env,
        CLAY_API_KEY: this.apiKey
      },
      stdio: ['pipe', 'pipe', 'inherit']
    });

    if (!this.process.stdout || !this.process.stdin) {
      throw new Error('Failed to create stdio streams for clay-mcp');
    }

    // Handle incoming JSON-RPC responses
    let buffer = '';
    this.process.stdout.on('data', (data: Buffer) => {
      buffer += data.toString();

      // Parse complete JSON-RPC messages (one per line)
      const lines = buffer.split('\n');
      buffer = lines[lines.length - 1]; // Keep incomplete line

      for (let i = 0; i < lines.length - 1; i++) {
        try {
          const response = JSON.parse(lines[i]) as MCPResponse;
          const request = this.pendingRequests.get(response.id as number);

          if (request) {
            this.pendingRequests.delete(response.id as number);

            if (response.error) {
              request.reject(new Error(`MCP Error: ${response.error.message}`));
            } else {
              request.resolve(response.result);
            }
          }
        } catch (error) {
          // Ignore parse errors (could be debug output)
        }
      }
    });

    this.process.on('error', (error: Error) => {
      // Reject all pending requests
      this.pendingRequests.forEach(({ reject }) => {
        reject(new Error(`clay-mcp process error: ${error.message}`));
      });
      this.pendingRequests.clear();
      this.process = undefined;
    });

    this.process.on('exit', () => {
      this.process = undefined;
    });

    // Give process time to initialize
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  /**
   * Search for contacts in Clay by query
   */
  async searchContacts(params: ClayLocalSearchParams): Promise<ClayLocalSearchResult> {
    const response = await this.callTool('searchContacts', {
      query: params.query,
      limit: params.limit || 10,
      ...(params.exclude_contact_ids && { exclude_contact_ids: params.exclude_contact_ids })
    });

    // clay-mcp returns data in content array
    if (response?.content && Array.isArray(response.content)) {
      const textContent = response.content.find((c: any) => c.type === 'text');
      if (textContent?.text) {
        try {
          const parsed = JSON.parse(textContent.text);
          return {
            results: Array.isArray(parsed) ? parsed : [parsed]
          };
        } catch (error) {
          console.error('[DEBUG] Failed to parse clay-mcp response:', error);
          return { results: [] };
        }
      }
    }

    // Handle legacy format for backwards compatibility
    if (response?.type === 'text' && response?.text) {
      try {
        const parsed = JSON.parse(response.text);
        return {
          results: Array.isArray(parsed) ? parsed : [parsed]
        };
      } catch {
        return { results: [] };
      }
    }

    return response || { results: [] };
  }

  /**
   * Get full contact details by ID
   */
  async getContact(contactId: number): Promise<ClayContact> {
    const response = await this.callTool('getContact', {
      contact_id: contactId
    });

    // clay-mcp returns data in content array
    if (response?.content && Array.isArray(response.content)) {
      const textContent = response.content.find((c: any) => c.type === 'text');
      if (textContent?.text) {
        try {
          return JSON.parse(textContent.text) as ClayContact;
        } catch (error) {
          console.error('[DEBUG] Failed to parse clay-mcp getContact response:', error);
          return response as ClayContact;
        }
      }
    }

    // Handle legacy format for backwards compatibility
    if (response?.type === 'text' && response?.text) {
      try {
        return JSON.parse(response.text) as ClayContact;
      } catch {
        return response as ClayContact;
      }
    }

    return response as ClayContact;
  }

  /**
   * Call an MCP tool via JSON-RPC over stdio
   */
  private async callTool(toolName: string, params: any): Promise<any> {
    try {
      await this.ensureConnected();

      if (!this.process?.stdin) {
        throw new Error('stdin not available for clay-mcp');
      }

      return new Promise((resolve, reject) => {
        const requestId = ++this.requestId;
        const request: MCPRequest = {
          jsonrpc: '2.0',
          id: requestId,
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: params
          }
        };

        // Register pending request
        this.pendingRequests.set(requestId, { resolve, reject });

        // Send request
        this.process!.stdin!.write(JSON.stringify(request) + '\n');

        // Timeout after 30 seconds
        setTimeout(() => {
          if (this.pendingRequests.has(requestId)) {
            this.pendingRequests.delete(requestId);
            reject(new Error(`clay-mcp call timeout for ${toolName}`));
          }
        }, 30000);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`clay-mcp call failed: ${message}`);
    }
  }

  /**
   * Get MCP name for logging/debugging
   */
  getMCPName(): string {
    return this.mcpName;
  }

  /**
   * Clean up the process
   */
  async cleanup(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = undefined;
    }
  }
}
