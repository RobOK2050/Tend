/**
 * Mesh API Client - direct HTTP access to the current Mesh API.
 *
 * Mesh uses the same numeric contact IDs that older Clay exports stored in
 * `External ID 1 - Value`, so the rest of Tend can keep using `clayId`.
 */

import fetch from 'node-fetch';
import type { ClayContact, EducationHistory, InteractionCount, WorkHistory } from '../models/clay-contact';

export interface MeshApiClientOptions {
  apiKey?: string;
  baseUrl?: string;
}

export interface MeshContactMetadata {
  source?: 'mesh' | 'csv';
  csvRowHash?: string;
  meshSyncedAt?: string;
  meshUpdatedAt?: string | null;
}

type MeshContact = Record<string, any>;

const EMPTY_COUNT: InteractionCount = {
  first_date: null,
  last_date: null,
  count: 0
};

export class MeshApiClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(options: MeshApiClientOptions = {}) {
    this.apiKey = options.apiKey || process.env.MESH_API_KEY || process.env.CLAY_API_KEY || '';
    this.baseUrl = options.baseUrl || 'https://api.me.sh';

    if (!this.apiKey) {
      throw new Error(
        'Mesh API key not found. Set CLAY_API_KEY or MESH_API_KEY in your environment.'
      );
    }
  }

  async getContact(contactId: number, metadata: MeshContactMetadata = {}): Promise<ClayContact> {
    const mesh = await this.makeRequest<MeshContact>('GET', `/api/v1/network/contacts/${contactId}/`);
    return mapMeshContactToClay(mesh, {
      ...metadata,
      source: 'mesh',
      meshSyncedAt: new Date().toISOString()
    });
  }

  private async makeRequest<T>(method: string, endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        Authorization: `ApiKey ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Tend/1.0'
      }
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Mesh API error (${response.status}): ${body || response.statusText}`);
    }

    return await response.json() as T;
  }
}

export function mapMeshContactToClay(mesh: MeshContact, metadata: MeshContactMetadata = {}): ClayContact {
  const id = Number(mesh.id || mesh.objectID || mesh.contact_id || 0);
  const name = stringValue(mesh.fullName)
    || stringValue(mesh.displayName)
    || [mesh.firstName, mesh.lastName].filter(Boolean).join(' ').trim()
    || `Contact ${id}`;

  const notes = extractNotes(mesh.notes);
  const socialLinks = extractSocialLinks(mesh);
  const emails = extractInformationValues(mesh, 'email');
  const phones = extractInformationValues(mesh, 'phone');
  const workHistory = extractWorkHistory(mesh);
  const educationHistory = extractEducationHistory(mesh);
  const lists = extractLists(mesh);

  return {
    id,
    displayName: stringValue(mesh.displayName) || name,
    name,
    avatarURL: stringValue(mesh.avatarURL) || null,
    isMemorialized: Boolean(mesh.isMemorialized),
    bio: stringValue(mesh.bio) || stringValue(mesh.headline) || stringValue(mesh.byline) || null,
    location: extractLocation(mesh),
    birthday: formatBirthday(mesh.birthday),
    emails,
    phone_numbers: phones,
    social_links: socialLinks,
    work_history: workHistory,
    education_history: educationHistory,
    score: numberValue(mesh.score) || 0,
    message_history: {
      first_date: stringValue(mesh.firstMessageDate),
      last_date: stringValue(mesh.lastMessageDate),
      count: numberValue(mesh.numberOfMessages) || 0
    },
    interaction_history: {
      first_date: stringValue(mesh.firstInteractionDate),
      last_date: stringValue(mesh.lastInteractionDate)
    },
    email_history: {
      first_date: stringValue(mesh.firstEmailDate),
      last_date: stringValue(mesh.lastEmailDate),
      count: numberValue(mesh.numberOfEmailInteractions) || 0
    },
    event_history: {
      first_date: stringValue(mesh.firstMeetingDate),
      last_date: stringValue(mesh.lastMeetingDate),
      count: numberValue(mesh.numberOfMeetings) || 0
    },
    groups: lists,
    created: stringValue(mesh.created) || new Date().toISOString(),
    url: `https://web.clay.earth/open/contact/${id}`,
    notes,
    integrations: extractIntegrations(mesh),
    source: metadata.source,
    csvRowHash: metadata.csvRowHash,
    meshSyncedAt: metadata.meshSyncedAt,
    meshUpdatedAt: metadata.meshUpdatedAt || stringValue(mesh.updated) || stringValue(mesh['@timestamp']) || null
  } as ClayContact;
}

export function mapCsvRowToClayContact(row: Record<string, string>, metadata: MeshContactMetadata = {}): ClayContact {
  const id = Number(row.ClayID || row['External ID 1 - Value'] || 0);
  const name = stringValue(row.Name)
    || [row.FirstName || row['Given Name'], row.LastName || row['Family Name']].filter(Boolean).join(' ').trim()
    || `Contact ${id}`;
  const groups = parseGroupMembership(row['Group Membership'] || row.Groups || '');
  const emails = extractCsvSeries(row, 'E-mail');
  const phones = extractCsvSeries(row, 'Phone');
  const websites = extractCsvSeries(row, 'Website');
  const notes = stringValue(row.Notes) ? [row.Notes.trim()] : [];
  const workHistory: WorkHistory[] = row['Organization Name'] || row['Organization Title']
    ? [{
        company: stringValue(row['Organization Name']) || '',
        title: stringValue(row['Organization Title']) || '',
        is_active: true
      }]
    : [];

  return {
    id,
    displayName: name,
    name,
    avatarURL: null,
    isMemorialized: false,
    bio: null,
    location: stringValue(row['Address 1 - Formatted']) || null,
    birthday: stringValue(row.Birthday) || null,
    emails,
    phone_numbers: phones,
    social_links: websites,
    work_history: workHistory,
    education_history: [],
    score: 0,
    message_history: { ...EMPTY_COUNT },
    interaction_history: { first_date: null, last_date: null },
    email_history: { ...EMPTY_COUNT },
    event_history: { ...EMPTY_COUNT },
    groups,
    created: new Date().toISOString(),
    url: `https://web.clay.earth/open/contact/${id}`,
    notes,
    integrations: [],
    source: metadata.source || 'csv',
    csvRowHash: metadata.csvRowHash,
    meshSyncedAt: metadata.meshSyncedAt,
    meshUpdatedAt: metadata.meshUpdatedAt || null
  } as ClayContact;
}

export function parseGroupMembership(groupMembership: string): string[] {
  if (!groupMembership) return [];
  return groupMembership
    .split(' ::: ')
    .map(group => group.trim())
    .filter(group => group.length > 0 && !group.startsWith('*'));
}

function extractInformationValues(mesh: MeshContact, type: string): string[] {
  const values = new Set<string>();
  for (const item of Array.isArray(mesh.information) ? mesh.information : []) {
    if (item?.type === type && stringValue(item.value)) {
      values.add(item.value.trim());
    }
  }
  return [...values];
}

function extractSocialLinks(mesh: MeshContact): string[] {
  const fields = [
    'linkedinURL',
    'twitterURL',
    'facebookURL',
    'instagramURL',
    'githubURL',
    'youtubeURL',
    'mediumURL',
    'redditURL',
    'quoraURL',
    'pinterestURL',
    'tumblrURL',
    'vimeoURL',
    'soundcloudURL',
    'slideshareURL',
    'angellistURL',
    'hackernewsURL',
    'aboutmeURL'
  ];
  const links = new Set<string>();
  for (const field of fields) {
    if (stringValue(mesh[field])) {
      links.add(mesh[field].trim());
    }
  }

  for (const item of Array.isArray(mesh.information) ? mesh.information : []) {
    if (['linkedin', 'twitter'].includes(item?.type) && stringValue(item.value)) {
      links.add(item.value.trim());
    }
  }

  for (const website of Array.isArray(mesh.websites) ? mesh.websites : []) {
    if (stringValue(website?.url)) {
      links.add(website.url.trim());
    }
  }

  return [...links];
}

function extractWorkHistory(mesh: MeshContact): WorkHistory[] {
  const orgs = Array.isArray(mesh.organizations) ? mesh.organizations : Array.isArray(mesh.orgs) ? mesh.orgs : [];
  return orgs
    .filter((org: any) => stringValue(org?.name) || stringValue(org?.title))
    .map((org: any) => ({
      company: stringValue(org.name) || '',
      title: stringValue(org.title) || '',
      is_active: Boolean(org.isPrimary || org.primary || org.active),
      start_year: extractYear(org.start || org.startDate),
      end_year: extractYear(org.end || org.endDate)
    }));
}

function extractEducationHistory(mesh: MeshContact): EducationHistory[] {
  const schools = Array.isArray(mesh.educations) ? mesh.educations : Array.isArray(mesh.edu) ? mesh.edu : [];
  return schools
    .filter((edu: any) => stringValue(edu?.name) || stringValue(edu?.school))
    .map((edu: any) => ({
      school: stringValue(edu.name) || stringValue(edu.school) || '',
      degree: stringValue(edu.degree) || null,
      start_year: extractYear(edu.start),
      end_year: extractYear(edu.end)
    }));
}

function extractNotes(notes: any): string[] {
  if (!Array.isArray(notes)) return [];
  return notes
    .map(note => typeof note === 'string' ? note : stringValue(note?.content) || stringValue(note?.note))
    .filter((note): note is string => Boolean(note));
}

function extractLists(mesh: MeshContact): string[] {
  const lists = Array.isArray(mesh.lists) ? mesh.lists : [];
  return lists
    .map((list: any) => stringValue(list.listTitle) || stringValue(list.title) || stringValue(list.name))
    .filter((list): list is string => Boolean(list));
}

function extractIntegrations(mesh: MeshContact): string[] {
  const integrations = Array.isArray(mesh.integrations) ? mesh.integrations : [];
  return integrations
    .map((integration: any) => typeof integration === 'string' ? integration : stringValue(integration?.name))
    .filter((integration): integration is string => Boolean(integration));
}

function extractLocation(mesh: MeshContact): string | null {
  if (stringValue(mesh.primaryLocation?.formatted)) return mesh.primaryLocation.formatted;
  if (stringValue(mesh.primaryLocation?.formatted_address)) return mesh.primaryLocation.formatted_address;
  if (stringValue(mesh.location)) return mesh.location;
  return null;
}

function formatBirthday(value: any): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const month = numberValue(value.month);
    const day = numberValue(value.day);
    const year = numberValue(value.year);
    if (month && day && year) return `${month}/${day}/${year}`;
    if (month && day) return `${month}/${day}`;
  }
  return null;
}

function extractCsvSeries(row: Record<string, string>, label: string): string[] {
  const values: string[] = [];
  for (const [key, value] of Object.entries(row)) {
    if (key.startsWith(`${label} `) && key.endsWith(' - Value') && stringValue(value)) {
      values.push(value.trim());
    }
  }
  return [...new Set(values)];
}

function extractYear(value: any): number | undefined {
  if (!value) return undefined;
  if (typeof value === 'number') return value > 999 ? value : undefined;
  const match = String(value).match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : undefined;
}

function stringValue(value: any): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : '';
}

function numberValue(value: any): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}
