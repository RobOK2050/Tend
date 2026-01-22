/**
 * Tend Contact model - normalized representation of contact data
 * This is the internal model used throughout Tend
 */

export type ContactType = 'person' | 'organization' | 'contact';
export type ContactStatus = 'active' | 'dormant';
export type Priority = 'high' | 'medium' | 'low';

export interface TendContact {
  // Core Identity
  name: string;
  displayName?: string;
  type: ContactType;
  id: string; // String version of Clay ID
  status: ContactStatus;

  // Contact Information
  email: string[];
  phone: string[];
  location: string | null;
  socialAccounts: SocialAccount[];

  // Relationship Context
  tags: string[];
  communities: string[]; // Clay groups (Bitcoin, Arc Aspicio, Photography, Family, etc.)
  priority: Priority;
  lastContact: Date | null;
  nextFollowup: Date | null;

  // Professional
  organization: string | null;
  title: string | null;
  industry: string[];
  workHistory: WorkHistoryNormalized[];
  educationHistory: EducationHistoryNormalized[];

  // Personal
  interests: string[];
  valuesAlignment: string[];
  bio: string | null;
  birthday: Date | null;

  // Source References
  clayId: number;
  clayUrl: string;
  avatarUrl: string | null;

  // Interaction Metrics
  relationshipScore: number;
  interactionStats: InteractionStats;

  // Metadata
  clayCreated: Date;
  tendCreated: Date;
  tendUpdated: Date;
  clayIntegrations: string[];

  // Notes (from Clay)
  clayNotes: string[];

  // TheBrain Links (parsed from notes)
  brainLinks: BrainLink[];
}

export interface SocialAccount {
  platform: string; // linkedin, twitter, facebook, instagram, etc.
  url: string;
}

export interface WorkHistoryNormalized {
  company: string;
  title: string;
  isActive?: boolean;
  startYear?: number;
  endYear?: number;
}

export interface EducationHistoryNormalized {
  school: string;
  degree: string | null;
  startYear?: number;
  endYear?: number;
}

export interface InteractionStats {
  firstInteraction: Date | null;
  lastInteraction: Date | null;
  messageCount: number;
  emailCount: number;
  eventCount: number;
}

export interface BrainLink {
  brainId: string;
  thoughtId: string;
  thoughtName: string;
  url: string;
}
