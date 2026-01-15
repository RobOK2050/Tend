/**
 * Clay Contact model - represents data structure returned by Clay MCPs
 * These are direct interfaces matching the Clay API responses
 */

export interface ClayContact {
  // Identity
  id: number;
  displayName: string;
  name: string;
  avatarURL: string | null;
  isMemorialized: boolean;

  // Profile
  bio: string | null;
  location: string | null;
  birthday: string | null; // Format: "M/D/YYYY" or "M/D"

  // Contact Info
  emails: string[];
  phone_numbers: string[];
  social_links: string[];

  // Professional
  work_history: WorkHistory[];
  education_history: EducationHistory[];

  // Interaction Metrics
  score: number; // Relationship strength score
  message_history: InteractionCount;
  interaction_history: InteractionDates;
  email_history: InteractionCount;
  event_history: InteractionCount;

  // Organization
  groups?: string[]; // Clay groups/communities this contact belongs to

  // Metadata
  created: string; // ISO datetime - when added to Clay
  url: string; // Clay web URL
  notes: string[]; // Array of note strings from Clay
  integrations: string[]; // Connected services (linkedin, email, calendar, etc.)
}

export interface WorkHistory {
  company: string;
  title: string;
  is_active?: boolean;
  start_year?: number;
  end_year?: number;
}

export interface EducationHistory {
  school: string;
  degree: string | null;
  start_year?: number;
  end_year?: number;
}

export interface InteractionCount {
  first_date: string | null; // ISO datetime
  last_date: string | null; // ISO datetime
  count: number;
}

export interface InteractionDates {
  first_date: string | null; // ISO datetime
  last_date: string | null; // ISO datetime
}

export interface SearchResult {
  total: number;
  results: SearchContact[];
}

export interface SearchContact {
  id: number;
  displayName: string;
  name: string;
  avatarURL: string | null;
  isMemorialized: boolean;
  bio?: string;
  score: number;
  url: string;
  social_links: string[];
  location: string | null;
  notes: string[];
  work_history: WorkHistory[];
  education_history: EducationHistory[];
}
