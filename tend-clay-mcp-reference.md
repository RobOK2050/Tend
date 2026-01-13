# Tend - Clay MCP Reference Documentation

> Reference for Claude Code when building the Tend CRM integration

## Overview

Rob has **two Clay MCPs** available. They access the same underlying Clay data (12,812 contacts) but have different tool signatures and return slightly different fields in search results.

| MCP | Identifier | Best For |
|-----|------------|----------|
| **Clay Official** | `Clay Official:` | Broader searches, social links in results, total count |
| **Clay Local** | `clay-mcp:` | Focused searches, interaction dates in search results, aggregations |

**Key Finding:** `getContact` returns **identical data** from both MCPs. The differences are primarily in **search result fields** and **available tools**.

---

## Available Tools Comparison

### Both MCPs Have:
| Tool | Purpose |
|------|---------|
| `searchContacts` | Search contacts by various criteria |
| `getContact` | Get full contact details by ID |
| `createContact` | Create new contact |
| `createNote` | Add note to contact |
| `getGroups` | List all groups/lists |
| `createGroup` | Create new group |
| `updateGroup` | Update group (add/remove contacts, rename) |
| `getNotes` | Get notes in date range |
| `getEvents` | Get calendar events in date range |

### Clay Official Only:
| Tool | Purpose |
|------|---------|
| `updateContact` | Update existing contact fields |
| `getEmails` | Get emails in date range |
| `getRecentEmails` | Get recent email interactions |
| `getUpcomingEvents` | Get upcoming calendar events |
| `getRecentReminders` | Get recent reminders |
| `getUpcomingReminders` | Get upcoming reminders |
| `find_duplicates` | Find potential duplicate contacts |
| `merge_contacts` | Merge duplicate contacts (destructive) |
| `archive_contact` | Archive a contact |
| `restore_contact` | Restore archived contact |
| `get_user_information` | Get current user info |

### Clay Local Only:
| Tool | Purpose |
|------|---------|
| `searchInteractions` | Search by interaction patterns, find best friends, recently added |
| `aggregateContacts` | Get counts and statistics (not specific contacts) |

---

## Data Schemas

### Contact (Full - from getContact)

Both MCPs return identical structure:

```typescript
interface Contact {
  // Identity
  id: number;                    // Unique identifier
  displayName: string;           // Display name
  name: string;                  // Full name
  avatarURL: string | null;      // Profile image URL
  isMemorialized: boolean;       // Memorial status
  
  // Profile
  bio: string | null;            // Biography text
  location: string | null;       // Location string
  birthday: string | null;       // Format: "M/D/YYYY" or "M/D"
  
  // Contact Info
  emails: string[];              // Email addresses
  phone_numbers: string[];       // Phone numbers
  social_links: string[];        // Social media URLs
  
  // Professional
  work_history: WorkHistory[];
  education_history: EducationHistory[];
  
  // Interaction Metrics
  score: number;                 // Relationship strength score
  message_history: {
    first_date: string | null;   // ISO datetime
    last_date: string | null;    // ISO datetime
    count: number;
  };
  interaction_history: {
    first_date: string | null;   // ISO datetime
    last_date: string | null;    // ISO datetime
  };
  email_history: {
    first_date: string | null;
    last_date: string | null;
    count: number;
  };
  event_history: {
    first_date: string | null;
    last_date: string | null;
    count: number;
  };
  
  // Metadata
  created: string;               // ISO datetime - when added to Clay
  url: string;                   // Clay web URL
  notes: string[];               // Array of note strings
  integrations: string[];        // Connected services
}

interface WorkHistory {
  company: string;
  title: string;
  is_active?: boolean;
  start_year?: number;
  end_year?: number;
}

interface EducationHistory {
  school: string;
  degree: string | null;
  start_year?: number;
  end_year?: number;
}
```

### Search Results - Clay Official

```typescript
interface OfficialSearchResponse {
  total: number;                 // Total matching contacts
  results: OfficialSearchContact[];
}

interface OfficialSearchContact {
  id: number;
  displayName: string;
  name: string;
  avatarURL: string | null;
  isMemorialized: boolean;
  bio?: string;
  score: number;
  url: string;                   // Format: https://web.clay.earth/open/contact/{id}
  social_links: string[];        // ✅ Included in search
  location: string | null;
  notes: string[];
  work_history: WorkHistory[];
  education_history: EducationHistory[];
  // ❌ NOT included: interaction dates, birthday, emails, phones
}
```

### Search Results - Clay Local

```typescript
interface LocalSearchContact {
  id: number;
  name: string;
  headline?: string;             // ✅ Local only
  bio?: string;
  location?: string;
  score: number;
  url: string;                   // Format: https://web.clay.earth/contact/{id}
  
  // ✅ Interaction dates included in search results
  first_interaction_date?: string;  // ISO datetime
  last_interaction_date?: string;   // ISO datetime
  birthday?: string;
  
  work_history: WorkHistory[];
  education_history: EducationHistory[];
  notes: string[];
  
  extra?: {
    displayName: string;
    bio?: string;
  };
  
  // ❌ NOT included: social_links, avatarURL, isMemorialized
}
```

---

## Search Parameters

### Clay Official: searchContacts

```typescript
interface OfficialSearchParams {
  // Text search
  name?: string[];               // Names to search
  keywords?: string[];           // Fallback keyword search
  note_content?: string[];       // Search within notes
  
  // Professional filters
  work_history?: {
    company?: string[];          // Company names
    position?: string[];         // Job titles
    active?: boolean;            // Currently employed there
  };
  education_history?: {
    school?: string[];
    degree?: string[];
    active?: boolean;
  };
  
  // Location
  location?: {
    latitude: number;
    longitude: number;
    distance?: number;           // Radius in km
  };
  
  // Groups
  group_ids?: (number | 'starred')[];
  
  // Interaction filters
  email_count?: { gte?: number; lte?: number };
  event_count?: { gte?: number; lte?: number };
  text_message_count?: { gte?: number; lte?: number };
  
  // Date filters (format: YYYY-MM-DD)
  first_interaction_date?: { gte?: string; lte?: string };
  last_interaction_date?: { gte?: string; lte?: string };
  first_email_date?: { gte?: string; lte?: string };
  last_email_date?: { gte?: string; lte?: string };
  first_event_date?: { gte?: string; lte?: string };
  last_event_date?: { gte?: string; lte?: string };
  first_text_message_date?: { gte?: string; lte?: string };
  last_text_message_date?: { gte?: string; lte?: string };
  note_date?: { gte?: string; lte?: string };
  
  // Birthday filters
  age?: { gte?: number; lte?: number };
  upcoming_birthday?: { gte?: string; lte?: string };
  previous_birthday?: { gte?: string; lte?: string };
  
  // Integration filter
  integration?: ('calendar' | 'twitter' | 'linkedin' | 'email' | 
                 'messages' | 'apple-contacts' | 'facebook' | 
                 'browser-extension' | 'business-cards' | 'carddav' | 
                 'zapier' | 'make' | 'instagram' | 'whatsapp' | 
                 'bulk-import' | 'google-contacts')[];
  
  // Pagination & sorting
  limit?: number;                // Default 100, max 1000
  exclude_contact_ids?: number[]; // For "show more" queries
  sort?: {
    field: 'relevance' | 'last_texted' | 'last_interacted' | 'created';
    direction: 'asc' | 'desc';
  };
}
```

### Clay Local: searchContacts

```typescript
interface LocalSearchParams {
  query: string;                 // Required - raw search query
  
  // Structured filters (extracted from query)
  company_name?: string[];       // LinkedIn-style company names
  job_title?: string[];          // LinkedIn-style job titles
  location?: string[];           // LinkedIn-style locations
  keywords?: string[];           // Skills, interests, hobbies
  
  // Pagination
  limit?: number;                // Default 10
  exclude_contact_ids?: number[]; // For pagination
  
  // Sorting
  sort_instructions?: string;    // Natural language: "most recent", "closest connections"
}
```

### Clay Local: searchInteractions

Same params as searchContacts - use for:
- "Who did I meet most?"
- Finding best friends by relevance score
- Recently added/created contacts

### Clay Local: aggregateContacts

```typescript
interface AggregateParams {
  query: string;                 // Required - describes what to count
  company_name?: string[];
  job_title?: string[];
  location?: string[];
}

// Returns: { total_contacts: number } or counts/percentages
```

---

## Groups

```typescript
interface Group {
  id: number;
  name: string;
}

// Special group ID: 'starred' can be used in group_ids filter
```

### Rob's Group Structure:
- `0.` - Life priorities (Life Connections, Reconnect)
- `1.` - Interest areas (Bitcoin, Tech Advisor, Photography)  
- `2A-D.` - Relationship tiers (Core → Acquaintance)
- `3.` - Professional/community (Federal, Cadre DC, OGM, OPM49)
- `5.` - Geographic/topical (Bluffton, NYC, Wine, Bourbon)
- Unlabeled - Organizations (Cornell, Arc Aspicio, Accenture)

---

## Integration Values

Possible values for `integrations` array:
- `calendar`
- `twitter`
- `linkedin`
- `email`
- `messages` (iMessage/SMS)
- `apple-contacts`
- `facebook`
- `instagram`
- `whatsapp`
- `browser-extension`
- `business-cards`
- `carddav`
- `zapier`
- `make`
- `bulk-import`
- `google-contacts`

---

## Usage Patterns for Tend

### Get full contact details
```
# Either MCP works identically
Clay Official:getContact { contact_id: 12345 }
clay-mcp:getContact { contact_id: 12345 }
```

### Search with interaction context (prefer Local)
```
clay-mcp:searchContacts {
  query: "Bitcoin contacts I haven't talked to recently",
  keywords: ["Bitcoin"],
  sort_instructions: "oldest interaction first"
}
```

### Broad search with social links (prefer Official)
```
Clay Official:searchContacts {
  keywords: ["Bitcoin"],
  limit: 100
}
# Returns total count + social_links in results
```

### Get statistics
```
clay-mcp:aggregateContacts {
  query: "how many contacts work at Google"
  company_name: ["Google"]
}
```

### Find duplicates (Official only)
```
Clay Official:find_duplicates { limit: 20 }
```

### Upcoming birthdays
```
Clay Official:searchContacts {
  upcoming_birthday: { 
    gte: "2026-01-12", 
    lte: "2026-01-19" 
  },
  limit: 50
}
```

---

## TheBrain Integration Notes

Rob also uses TheBrain MCP (`thebrain:`) for knowledge graph relationships. Key tools:
- `thebrain:search_thoughts` - Find thoughts by text
- `thebrain:get_thought_graph` - Get thought with connections
- `thebrain:create_link` - Link thoughts together

Contact notes in Clay often contain TheBrain links in format:
```
brain://api.thebrain.com/{brainId}/{thoughtId}/{thoughtName}
```

Consider parsing these to cross-reference Clay contacts with TheBrain thoughts.

---

## Recommended Architecture for Tend

1. **Use Local MCP** (`clay-mcp:`) as primary for:
   - Searches needing interaction dates
   - Aggregations/statistics
   - Relationship strength queries

2. **Use Official MCP** (`Clay Official:`) for:
   - Contact mutations (update, archive, merge)
   - Duplicate detection
   - When you need social_links in search results
   - Reminder management

3. **Use getContact from either** for full details (identical output)

4. **Normalize the data** - Create unified Contact type that merges search result variations

5. **Cross-reference with TheBrain** for knowledge graph context
