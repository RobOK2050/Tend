/**
 * Vault File models - represent the structure of markdown files in Obsidian vault
 */

import type { ContactType, ContactStatus, Priority } from './tend-contact';

export interface VaultFile {
  path: string;
  frontmatter: Frontmatter;
  body: FileBody;
  rawContent: string;
}

export interface Frontmatter {
  // Core Identity
  name: string;
  type: ContactType;
  clayId: number;
  status: ContactStatus;
  created: string; // ISO date (YYYY-MM-DD)
  updated: string; // ISO date (YYYY-MM-DD)

  // Contact Information
  email?: string[];
  phone?: string[];
  location?: string;
  social?: { [platform: string]: string };

  // Relationship Context
  tags?: string[];
  priority?: Priority;
  lastContact?: string; // ISO date
  nextFollowup?: string; // ISO date

  // Professional
  organization?: string;
  title?: string;
  industry?: string[];

  // Personal
  interests?: string[];
  valuesAlignment?: string[];
  birthday?: string; // ISO date

  // Source References
  clayUrl?: string;
  clayCreated?: string;
  clayIntegrations?: string[];

  // Interaction Metrics
  relationshipScore?: number;
  interactions?: {
    first: string; // ISO date
    last: string; // ISO date
    messageCount: number;
    emailCount: number;
    eventCount: number;
  };

  // User customizations (preserved across syncs)
  [key: string]: any;
}

export interface FileBody {
  systemSections: SystemSection[];
  userSections: UserSection[];
  dateStampedEntries: DateEntry[];
}

export interface SystemSection {
  heading: string;
  level: number; // 2 for ##, 3 for ###, etc.
  content: string;
  systemManaged: true;
}

export interface UserSection {
  heading: string;
  level: number;
  content: string;
  systemManaged: false;
  preserve: true; // NEVER overwrite
}

export interface DateEntry {
  date: string; // YYYY-MM-DD
  level: number; // Usually 4 for ####
  content: string;
  preserve: true; // NEVER overwrite
}

/**
 * Configuration for system-managed vs user-managed sections
 */
export const SECTION_CONFIG = {
  systemSections: [
    'Links',
    'Contact Details',
    'Work History',
    'Education History',
    'Interaction History',
    'Clay Notes'
  ],
  userSections: [
    'Notes',
    'Journal',
    'Thoughts',
    'Personal'
  ]
};
