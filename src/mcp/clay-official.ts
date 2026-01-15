/**
 * Clay Official MCP Client - Cloud-based REST API for Clay.earth
 * Makes direct HTTP calls to Clay's API using an API key
 */

import fetch from 'node-fetch';
import type { ClayContact } from '../models/clay-contact';
import type {
  ClayOfficialSearchParams,
  ClayOfficialGetContactParams,
  ClayOfficialSearchResult
} from './types';

export class ClayOfficialMCPClient {
  private mcpName: string = 'Clay Official';
  private apiKey: string;
  private baseUrl: string = 'https://api.clay.earth/api/v1';

  constructor(apiKey?: string) {
    // Get API key from parameter, environment, or throw error
    this.apiKey = apiKey || process.env.CLAY_API_KEY || '';

    if (!this.apiKey) {
      throw new Error(
        'Clay API key not found. Please provide one of:\n' +
        '1. Pass to constructor: new ClayOfficialMCPClient("key")\n' +
        '2. Set CLAY_API_KEY environment variable\n' +
        '3. Contact support@clay.earth for your API key'
      );
    }
  }

  /**
   * Search for contacts in Clay by query
   */
  async searchContacts(params: ClayOfficialSearchParams): Promise<ClayOfficialSearchResult> {
    const response = await this.makeRequest('POST', '/contacts/search', {
      query: params.query,
      limit: params.limit || 10,
      ...(params.exclude_contact_ids && { exclude_contact_ids: params.exclude_contact_ids })
    });

    return response;
  }

  /**
   * Get full contact details by ID
   */
  async getContact(contactId: string | number): Promise<ClayContact> {
    const response = await this.makeRequest('GET', `/contacts/${contactId}`);
    return response as ClayContact;
  }

  /**
   * Make authenticated HTTP request to Clay API
   */
  private async makeRequest(method: string, endpoint: string, body?: any): Promise<any> {
    try {
      const url = `${this.baseUrl}${endpoint}`;

      const options: any = {
        method,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Tend/1.0'
        }
      };

      if (body && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Clay API error (${response.status}): ${response.statusText}`;

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Clay API request failed: ${message}`);
    }
  }

  /**
   * Get MCP name for logging/debugging
   */
  getMCPName(): string {
    return this.mcpName;
  }

  /**
   * Set API key for authentication
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }
}
