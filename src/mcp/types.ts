/**
 * MCP Types - Model Context Protocol interfaces for Clay MCPs
 */

/**
 * JSON-RPC request structure for MCP tools
 */
export interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: 'tools/call';
  params: {
    name: string; // Tool name (e.g., "searchContacts", "getContact")
    arguments: Record<string, any>; // Tool arguments
  };
}

/**
 * JSON-RPC response structure
 */
export interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: {
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: any; // Parsed JSON data from tool
  };
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * Clay Local MCP search parameters
 */
export interface ClayLocalSearchParams {
  query: string; // Required - raw search query
  limit?: number; // Default 10
  exclude_contact_ids?: number[];
}

/**
 * Clay Local MCP getContact parameters
 */
export interface ClayLocalGetContactParams {
  contact_id: number; // Required - numeric ID
}

/**
 * Search result from Clay Local MCP
 */
export interface ClayLocalSearchResult {
  total?: number;
  results: any[]; // Array of contacts matching search
}

/**
 * Clay Official MCP search parameters
 */
export interface ClayOfficialSearchParams {
  query: string; // Required - raw search query (name, email, etc.)
  limit?: number; // Default 10
  exclude_contact_ids?: (string | number)[];
}

/**
 * Clay Official MCP getContact parameters
 */
export interface ClayOfficialGetContactParams {
  contact_id: string | number; // Required - can be numeric or string ID
}

/**
 * Search result from Clay Official MCP
 */
export interface ClayOfficialSearchResult {
  total?: number;
  results: any[]; // Array of contacts matching search
}
