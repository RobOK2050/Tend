# Tend Specification

**Version:** 1.0
**Status:** In Development (Phases 1A-1D Complete, 1E-1F Planned)
**Last Updated:** January 13, 2026
**Owner:** Rob Woodmont

---

## Executive Summary

Tend is a personal CRM CLI tool that syncs contact data from Clay.earth to Obsidian markdown files. It transforms Clay's contact management system into a markdown-based, future-proof knowledge base that integrates with Obsidian vault workflows.

**Core Value:** Keep your relationship data in plain text, queryable, version-controlled, and eternally accessible—not locked in a proprietary system.

---

## 1. Vision & Goals

### Vision
A unified, plaintext relationship management system that:
- Leverages Clay's superior data collection (social media, email, messages, calendar)
- Stores everything as Obsidian markdown for human readability and AI friendliness
- Preserves user customizations and personal notes across syncs
- Enables rich relationship intelligence through structured metadata

### Goals

**Primary:**
- Keep relationship data as plain text markdown (future-proof)
- Sync Clay contact data to Obsidian vault automatically
- Preserve user notes and customizations on re-sync
- Provide queryable metadata via YAML frontmatter
- Support batch processing for multiple contacts

**Secondary:**
- Enable bidirectional workflows (update Clay from Obsidian notes)
- Support complex relationship queries via Dataview
- Scale to 200+ contacts

---

## 2. Problem Statement

### Current Workflow Issues

**Without Tend:**
1. Clay has the contact data but isn't suitable for long-form relationship documentation
2. Obsidian has excellent markdown structure but no automatic Clay integration
3. Manual copy-paste defeats the purpose of automated CRM
4. Data silos: relationship context split between Clay and Obsidian

**What Tend Solves:**
- Automates Clay → Obsidian sync
- Keeps system-managed data fresh from Clay
- Preserves user-written context and family notes
- Single source of truth: Obsidian markdown

---

## 3. Solution Overview

### How It Works

```
┌─────────────┐
│ Clay.earth  │  (Contact data source)
│  (12,812    │  - Email, phone, socials
│  contacts)  │  - Interaction history
└──────┬──────┘  - Work history
       │
       │ (clay-mcp)
       ↓
┌─────────────────┐
│ Tend CLI Tool   │
│ - Search/Sync   │
│ - Map data      │
│ - Generate MD   │
└──────┬──────────┘
       │
       ↓
┌──────────────────────────────────────┐
│ Obsidian Markdown Files              │
│ (~/Documents/Thoughts in Time/...)   │
│                                      │
│ Harry Oppenheim.md                   │
│ ├─ YAML Frontmatter                  │
│ ├─ System Sections (regenerated)     │
│ ├─ User Sections (preserved)         │
│ └─ Date Entries (preserved)          │
└──────────────────────────────────────┘
       │
       ↓
  ┌─────────────────┐
  │ Obsidian Vault  │
  │ - Bidirectional │
  │   links         │
  │ - Dataview      │
  │   queries       │
  │ - Daily notes   │
  └─────────────────┘
```

### Key Design Principles

1. **Future-Proof Data Portability**
   - Plain text markdown (survives tool obsolescence)
   - No vendor lock-in
   - Human and AI-readable
   - Version control compatible

2. **User Control & Privacy**
   - Local-only (no cloud sync)
   - Complete user customization
   - Preservation of personal notes
   - Clear separation: system vs. user sections

3. **Automation Without Friction**
   - Single command to sync
   - Callable from other tools (Claude Code)
   - Batch processing support
   - Dry-run for safety

4. **Relationship Intelligence**
   - Rich metadata in YAML
   - Interaction metrics and history
   - Relationship strength scoring
   - Integration with personal interests/values

---

## 4. User Personas & Use Cases

### Primary User
**Rob** - Personal knowledge manager
- Uses Clay to aggregate contact data from multiple sources
- Maintains Obsidian vault as personal knowledge base
- Manually writes relationship insights and family information
- Syncs contacts monthly/quarterly
- Wants relationship data to outlive Clay.earth

### Use Cases

**UC1: Initial Contact Sync**
```
Actor: Rob
Trigger: "I want to get Harry Oppenheim's data from Clay into Obsidian"

Steps:
1. Run: tend sync --name "Harry Oppenheim"
2. Tend searches Clay for contact
3. Fetches full contact details
4. Generates markdown with YAML + sections
5. Writes to: Harry Oppenheim.md
6. File appears in Obsidian vault
7. Rob can read and link to other notes

Result: Contact data available in Obsidian
```

**UC2: Batch Sync Priority Contacts**
```
Actor: Rob
Trigger: "I want to sync my Bitcoin contacts from Clay (about 50 people)"

Steps:
1. Create file: bitcoin-contacts.txt (list of names)
2. Run: tend sync --input bitcoin-contacts.txt --verbose
3. Tend searches Clay for each contact
4. Generates markdown for each
5. Writes to vault
6. Shows progress: "50/50 synced"

Result: All Bitcoin contacts in Obsidian with synced data
```

**UC3: Update Contact with Latest Data**
```
Actor: Rob
Trigger: "I added notes about Harry, now want fresh data from Clay"

Steps:
1. Run: tend sync --name "Harry Oppenheim"
2. Tend fetches latest data from Clay
3. Updates system sections (Work History, Interaction History, etc.)
4. **Preserves** Notes and Family Notes sections
5. **Preserves** date entries (####2025-01-10)

Result: Fresh data without losing personal notes
```

**UC4: Add Family Information**
```
Actor: Rob
Trigger: "I met Harry's wife Sarah, want to record that"

Steps:
1. Open: Harry Oppenheim.md in Obsidian
2. Go to ## Family Notes section
3. Add: "Wife: Sarah (met at conference 2025)"
4. Run: tend sync --name "Harry Oppenheim"
5. System sections update
6. Family Notes preserved

Result: Relationship context preserved across syncs
```

**UC5: Query Relationships**
```
Actor: Rob (via Obsidian Dataview plugin)
Trigger: "Show me all high-priority contacts I haven't spoken to in 6 months"

Dataview Query:
```dataview
WHERE priority = "high" AND
      lastContact < date(2025-07-13)
SORT lastContact DESC
```

Result: List of contacts needing attention
```

---

## 5. Core Features

### Implemented (Phases 1A-1D) ✅

#### 5.1 Contact Data Model
- Full Clay contact structure captured
- Normalized to Tend contact format
- Supports: emails, phones, social accounts, work/education history, interaction metrics
- Bio, location, birthday fields
- Relationship strength score
- Integration tracking (LinkedIn, email, calendar, etc.)

#### 5.2 Markdown Generation
- Compact, scannable format
- YAML frontmatter with queryable metadata
- System-managed sections: Links, Contact Details, Work History, Education, Interaction History, Clay Notes
- User-managed sections: Notes, Family Notes
- Table-based contact details (not verbose)
- One-liner work/education entries

#### 5.3 CLI Interface
- Single `tend sync` command
- Options: `--name`, `--fixture`, `--vault`, `--dry-run`, `--verbose`
- Help system (`--help`)
- Colored output with progress indicators
- Error handling and summaries

#### 5.4 File Operations
- Write markdown to Obsidian vault
- Auto-detect and overwrite existing files
- Filename sanitization (remove invalid characters)
- Path validation
- Async file operations

#### 5.5 MCP Integration Framework
- Placeholder for clay-mcp connection
- Structure ready for real Clay API calls
- Error messages guide next steps
- Fixture mode works for testing

### Planned (Phases 1E-1F) ⏳

#### 5.6 Intelligent Merge (Phase 1F)
- Parse existing markdown files
- Identify system vs user sections
- Detect and preserve date entries (####YYYY-MM-DD)
- Update system sections with fresh Clay data
- **Never** overwrite user sections
- Smart conflict handling

#### 5.7 Batch Processing (Phase 1E) ✅ Complete
**Input File Formats:**
- **Text (.txt):** One contact name per line. Lines starting with `#` are comments.
- **CSV (.csv):** Compact format with columns: `Name`, `Given Name`, `Family Name`, `Group Membership`, `External ID 1 - Value`

**Group Membership Handling:**
- Groups are extracted from CSV's `Group Membership` column (delimited by ` ::: `)
- System entries (starting with `*`) are filtered out
- Contacts are organized into group folders based on priority list (defined in `config/group-priority.md`)
- Contacts with 0 groups → `Ungrouped/` folder
- Contacts with 1 group → group folder (no priority check needed)
- Contacts with 2+ groups → highest priority group folder (first match in priority list)

**Checkpoint & Resume:**
- Persistent state tracking in `tend-checkpoint.txt` stores last successfully processed sequence number
- Supports resumable processing: interruptions don't lose progress
- Each contact written updates checkpoint immediately
- On error: checkpoint not updated, allows resume from failure point

**Features:**
- Configurable batch size (limit contacts processed per run)
- Rate limiting: 100ms delay between MCP API calls
- Progress reporting with success/failure counts
- Error tracking with detailed messages
- Dry-run mode for preview without writing files

#### 5.8 Configuration Management (Phase 1E)
- JSON config file support
- Vault path configuration
- MCP endpoint configuration
- Template customization
- Logging level settings

#### 5.8 Group-Based Folder Organization ✅ Complete
**Vault Structure:**
```
40 Connections/
├── Grouped/
│   ├── Family/
│   │   ├── Jim O'Keefe.md
│   │   ├── Lynn Ann Casey.md
│   │   └── ...
│   ├── 1. Tech Advisor/
│   │   ├── Zachary Hamed.md
│   │   └── ...
│   ├── 3. OGM/
│   │   ├── John Warinner.md
│   │   └── ...
│   └── [other groups]
└── Ungrouped/
    ├── Trevor James Newell.md
    ├── christopher Bennett'.md
    └── ...
```

**Group Priority List:**
Defined in `config/group-priority.md`, specifies the order of groups for priority matching. When a contact belongs to multiple groups, it's placed in the folder of the highest-priority group.

**Algorithm:**
1. If contact has 0 groups → place in `Ungrouped/`
2. If contact has 1 group → place in that group's folder (no priority check)
3. If contact has 2+ groups → iterate through priority list in order, place in first matching group

**Example:**
- Contact has groups: ["5. Wine", "2D. Acquaintance", "Arc Aspicio"]
- Priority list order: ["O. Life Connections", "Family", "Arc Aspicio", "1. Tech Advisor", "3. OGM", ...]
- Result: Contact placed in `Arc Aspicio/` (comes first in priority list)

#### 5.9 Logging & Monitoring (Phase 1E)
- Structured logging
- Log file output
- Timestamp tracking
- Error vs. success counts
- Dry-run mode for safety

### Future (Phase 2+) 🔮

#### 5.10 Clay Official MCP Support
- Additional tools from Clay Official API
- Mutation support (update, create, archive)
- Duplicate detection
- Advanced filtering

#### 5.11 Bidirectional Sync
- Update Clay from Obsidian edits
- Keep Clay as source, Obsidian as interface
- Conflict resolution strategy
- Two-way relationship updates

---

## 6. Data Model

### ClayContact (from API)
```typescript
{
  id: number;
  name: string;
  displayName: string;
  emails: string[];
  phone_numbers: string[];
  social_links: string[];
  work_history: [{company, title, is_active, start_year, end_year}];
  education_history: [{school, degree, start_year, end_year}];
  score: number;  // 0-100 relationship strength
  interaction_history: {first_date, last_date};
  message_history: {count, first_date, last_date};
  email_history: {count, first_date, last_date};
  event_history: {count, first_date, last_date};
  bio: string | null;
  location: string | null;
  birthday: string | null;  // "M/D/YYYY" or "M/D"
  notes: string[];
  integrations: string[];  // linkedin, email, calendar, etc.
  created: string;  // ISO datetime
  url: string;  // Clay web URL
  avatarURL: string | null;
  isMemorialized: boolean;
}
```

### TendContact (normalized)
```typescript
{
  // Core Identity
  name: string;
  type: 'person' | 'organization' | 'contact';
  id: string;
  status: 'active' | 'dormant' | 'archived';

  // Contact Information
  email: string[];
  phone: string[];
  location: string | null;
  socialAccounts: [{platform, url}];

  // Relationship
  tags: string[];
  priority: 'high' | 'medium' | 'low';
  lastContact: Date | null;
  nextFollowup: Date | null;

  // Professional
  organization: string | null;
  title: string | null;
  workHistory: [{...}];
  educationHistory: [{...}];

  // Personal
  interests: string[];
  valuesAlignment: string[];
  bio: string | null;
  birthday: Date | null;

  // Metrics
  relationshipScore: number;
  interactionStats: {
    firstInteraction: Date | null;
    lastInteraction: Date | null;
    messageCount: number;
    emailCount: number;
    eventCount: number;
  };

  // Source
  clayId: number;
  clayUrl: string;

  // Notes
  clayNotes: string[];

  // Metadata
  clayCreated: Date;
  tendCreated: Date;
  tendUpdated: Date;
}
```

### Markdown File Structure
```yaml
---
# Queryable metadata
name: "Contact Name"
type: person
clayId: 12345
status: active
created: 2020-10-15
updated: 2026-01-13

email: [emails]
phone: [phones]
location: "City, State"
social:
  linkedin: "url"
  twitter: "url"

tags: [tags]
priority: high
lastContact: 2025-06-03
organization: "Company"
title: "Job Title"

relationshipScore: 95
interactions:
  first: 2020-10-15
  last: 2025-06-03
  messageCount: 245
  emailCount: 1203
  eventCount: 89

clayUrl: "https://clay.earth/..."
clayCreated: 2020-10-15
clayIntegrations: [linkedin, email, calendar]
---

# System Sections (regenerated on sync)

## Links
[[Obsidian Wikilinks]]

## Contact Details
| Email | value |
| Phone | value |
| Role  | value |

## Work History
- CEO @ Company (current)
- Title @ Company [year-year]

## Education
- School - Degree [year-year]

## Interaction History
**Score:** 95/100
**Activity:** 1203 emails, 245 messages, 89 events

## Clay Notes
- Notes from Clay

---

# User Sections (preserved on sync)

## Notes
[User-managed notes, never overwritten]

## Family Notes
[Spouse, kids, pets, family context]

# Date Entries (preserved on sync)

#### 2025-06-03
* Met for coffee
* Discussed project X
* Connected with mutual contact

#### 2025-05-20
* Email: Confirmed partnership
```

---

## 7. CLI Specification

### Command Structure
```
tend <command> [options]
```

### Commands

#### 7.1 sync
**Purpose:** Sync contacts from Clay to Obsidian vault

**Syntax:**
```bash
tend sync [options]
```

**Options:**
```
-n, --name <name>           Sync single contact by name
-i, --input <file>          Sync from file (.txt or .csv format)
-f, --fixture <name>        Use fixture for testing
--batch-size <number>       Limit batch to N contacts (default: all)
--start-from <sequence>     Start from specific sequence number (CSV mode, overrides checkpoint)
--reset-checkpoint          Reset checkpoint and process from beginning (CSV mode)
-v, --vault <path>          Override vault path
--mcp <strategy>            MCP strategy: "official" or "local" (default: local)
--dry-run                   Preview without writing
--verbose                   Detailed output
-h, --help                  Show help
```

**Examples:**
```bash
# Sync sample fixture (default)
tend sync

# Single contact
tend sync --name "Harry Oppenheim"

# Text file mode (simple names)
tend sync --input contacts.txt --batch-size 5 --verbose

# CSV mode with batch limit (first 100 contacts)
tend sync --input contacts.csv --batch-size 100 --verbose

# Resume from checkpoint (CSV mode)
# - Reads checkpoint, starts from last sequence + 1
tend sync --input contacts.csv --batch-size 100 --verbose

# Reset checkpoint and restart from beginning
tend sync --input contacts.csv --batch-size 100 --reset-checkpoint

# Override checkpoint, start from specific sequence
tend sync --input contacts.csv --batch-size 100 --start-from 500

# Preview only (no file writes)
tend sync --input contacts.csv --batch-size 10 --dry-run --verbose

# Custom vault path
tend sync --input contacts.csv --vault /custom/vault/path
```

**Exit Codes:**
- `0` - Success
- `1` - Error (contact not found, file write failed, etc.)

**Output:**
```
📋 Tend Sync

Vault: /Users/Woodmont/Documents/Thoughts in Time/40 Connections
Dry Run: NO

Summary:
✓ Synced: 3
✗ Failed: 0
```

---

## 8. File Format Specification

### Filename Convention
**Format:** `{Full Name}.md`
**Examples:**
- `Harry Oppenheim.md`
- `Jane Doe.md`
- `John Smith Jr.md`

**Sanitization Rules:**
- Remove: `< > : " / \ | ? *`
- Preserve: spaces, hyphens, apostrophes
- Max length: 200 characters
- Trim leading/trailing spaces and dots

### Input File Formats

#### Text File (.txt)
**Format:** One contact name per line
```
John Haar
Jane Smith
Harry Oppenheim
# This is a comment - ignored
Alice Johnson
Bob Williams
```

**Rules:**
- One name per line (full name or partial name for Clay search)
- Lines starting with `#` are comments
- Empty lines are ignored
- Whitespace is trimmed automatically

#### CSV File (.csv) - Compact Format
**Format:** Five columns with headers
```
Name,Given Name,Family Name,Group Membership,External ID 1 - Value
John Haar,John,Haar,Family,45251961
Jane Smith,Jane,Smith,1. Tech Advisor ::: 3. OGM,45251751
Harry Oppenheim,Harry,Oppenheim,Arc Aspicio ::: Cornell,45252064
Alice Johnson,Alice,Johnson,* myContacts,45251688
Bob Williams,Bob,Williams,Family ::: 1. Tech Advisor,45262952
```

**Column Descriptions:**
- **Name:** Full name (for human readability only)
- **Given Name:** First name (for human readability only)
- **Family Name:** Last name (for human readability only)
- **Group Membership:** Space-delimited group list; system entries starting with `*` are filtered out
- **External ID 1 - Value:** Clay contact ID (numeric)

**Rules:**
- Header row is mandatory with exact column names (case-sensitive)
- Fields with commas must be quoted: `"Smith, Jr.", "Smith", "Jr."`
- Group Membership uses ` ::: ` as delimiter (three spaces with colons)
- System entries (starting with `*`) are automatically filtered out
- Auto-generates sequence numbers from row position (1, 2, 3, ...)
- Checkpoint file tracks last processed sequence for resume capability

### YAML Frontmatter
**Required fields:**
- `name` - Contact full name
- `type` - person | organization | contact
- `clayId` - Numeric ID from Clay
- `status` - active | dormant (based on 2-year interaction history threshold)
- `created` - ISO date (YYYY-MM-DD)
- `updated` - ISO date (YYYY-MM-DD)

**Optional fields:**
- `email` - Array of email addresses
- `phone` - Array of phone numbers
- `location` - City, State or location string
- `social` - Object {platform: url}
- `tags` - Array of tags
- `communities` - Array of group names (from CSV Group Membership column)
- `priority` - high | medium | low
- `lastContact` - ISO date
- `nextFollowup` - ISO date (user-managed)
- `organization` - Company/org name
- `title` - Job title
- `relationshipScore` - 0-100
- `interactions` - Object {first, last, counts}
- `clayUrl` - Link to Clay web interface

**Constraints:**
- YAML must be valid (checked on write)
- All dates ISO 8601 format
- All arrays must be valid YAML
- Scores must be 0-100 integer

### Markdown Body

**Section Hierarchy:**
```
## Main Sections (Level 2)
### Subsections (Level 3)

#### Date Entries (Level 4)
YYYY-MM-DD format only
```

**System Sections** (regenerated on sync):
1. Links
2. Contact Details
3. Work History
4. Education
5. Interaction History
6. Clay Notes

**User Sections** (preserved on sync):
1. Notes
2. Family Notes

**Date Entries** (preserved on sync):
```
#### YYYY-MM-DD
* Bullet points
* One entry per contact interaction
```

### Validation Rules

**File-level:**
- File must start with `---` (YAML delimiter)
- YAML must be valid
- Body must be valid markdown
- Max file size: 10MB (per contact)

**Section-level:**
- User sections must exist and be empty initially
- Date entries must match `####YYYY-MM-DD` pattern
- No duplicate section names

**Content-level:**
- Email addresses must be valid format
- Phone numbers stored as-is (user responsible for format)
- URLs must be valid
- Dates must be ISO 8601

### Checkpoint File (tend-checkpoint.txt)
**Purpose:** Persistent state tracking for resumable batch processing

**Format:**
```
20
```
Simple integer file containing the last successfully processed sequence number.

**Behavior:**
- Created automatically on first batch run
- Updated after each successfully synced contact
- Not updated if contact sync fails (allows resume from failure point)
- Used by `--start-from` and `--reset-checkpoint` options

**Example Workflow:**
```
# First run: Process contacts 1-100
tend sync --input contacts.csv --batch-size 100
# Creates tend-checkpoint.txt with: 100

# Next run: Process contacts 101-200 (resumes from checkpoint)
tend sync --input contacts.csv --batch-size 100
# Updates tend-checkpoint.txt with: 200

# Override checkpoint
tend sync --input contacts.csv --batch-size 100 --start-from 500
# Updates tend-checkpoint.txt with: 600

# Reset checkpoint
tend sync --input contacts.csv --batch-size 100 --reset-checkpoint
# Resets tend-checkpoint.txt, starts from 0
```

---

## 9. Architecture Overview

### Components

```
┌─────────────────────────────────────────────────┐
│ CLI Interface (index.ts)                        │
│ Commands: sync, validate, help                  │
└──────────────────┬──────────────────────────────┘
                   │
        ┌──────────┼──────────┐
        ↓          ↓          ↓
   ┌─────────┐ ┌──────────┐ ┌──────────┐
   │ MCP     │ │ Mapper   │ │ Template │
   │ Client  │ │ (Clay→   │ │ Engine   │
   │         │ │ Tend)    │ │ (Tend→   │
   │ clay-   │ │          │ │ Markdown)│
   │ mcp     │ │ Contact  │ │          │
   │         │ │ Mapper   │ │ Markdown │
   └────┬────┘ └────┬─────┘ │ Generation│
        │           │        │          │
        └───────────┼────────┤          │
                    │        │          │
                    ↓        ↓          │
              ┌─────────────────┐       │
              │ Data Models     │       │
              │ - ClayContact   │       │
              │ - TendContact   │       │
              │ - VaultFile     │
              └─────────────────┘      │
                                       ↓
                           ┌──────────────────┐
                           │ File Manager     │
                           │ - Read existing  │
                           │ - Write markdown │
                           │ - Overwrite      │
                           │ - Sanitize names │
                           └────────┬─────────┘
                                    │
                                    ↓
                           ┌──────────────────┐
                           │ Obsidian Vault   │
                           │ (markdown files) │
                           └──────────────────┘
```

### Data Flow

```
Clay Contact (JSON)
    ↓
ContactMapper.mapClayToTend()
    ↓
TendContact (normalized)
    ↓
TemplateEngine.generateMarkdown()
    ↓
Markdown String
    ↓
FileManager.writeContact()
    ↓
*.md file in vault
```

### Key Classes

- **ContactMapper** - Clay → Tend transformation logic
- **TemplateEngine** - Markdown generation
- **FrontmatterGenerator** - YAML frontmatter creation
- **BodySectionGenerator** - Markdown section creation
- **VaultFileManager** - File I/O and vault operations
- **ClayLocalMCPClient** - MCP integration (framework)
- **BodySectionManager** - Section type detection (for Phase 1F)

---

## 10. Success Criteria

### Phase 1 Complete When:

✅ **Data Generation**
- Can transform Clay contact to Tend format (Phase 1A)
- Can generate valid markdown from Tend contact (Phase 1B)
- Generated YAML is valid and parseable (Phase 1B)
- All sections present and properly formatted (Phase 1B)

✅ **File Operations**
- Can write markdown to vault (Phase 1C)
- Can overwrite existing files (Phase 1C)
- Filenames sanitized correctly (Phase 1C)
- Vault path validation works (Phase 1C)

✅ **CLI & Integration**
- Single command syncs contact (Phase 1C)
- Fixture mode works for testing (Phase 1D)
- Help system functional (Phase 1C)
- Dry-run mode shows preview (Phase 1C)

✅ **MCP Framework**
- Structure ready for real Clay calls (Phase 1D)
- Error messages guide next steps (Phase 1D)
- CLI accepts contact name parameter (Phase 1D)

### Phase 1E Complete When:

✅ **Batch Processing**
- Can read list of names from file
- Process 200+ contacts without errors
- Progress reporting works
- Error tracking and summary

✅ **Logging**
- Structured logs to file
- Timestamp tracking
- Error vs. success counts
- Verbose mode provides details

### Phase 1F Complete When:

✅ **Intelligent Merge**
- Markdown parser reads existing files
- Identifies system vs user sections
- Detects date entries (####YYYY-MM-DD)
- Updates system sections
- **Never** overwrites user sections
- Preserves date entries exactly

✅ **Data Integrity**
- Can re-sync contact safely
- User notes preserved
- Family notes preserved
- Interaction history updated
- Zero data loss

---

## 11. Constraints & Limitations

### Phase 1 Constraints

**Communication:**
- No direct clay-mcp integration yet (Phase 1D is framework only)
- Fixture data for testing; real Clay data coming later
- Requires manual Clay → Tend data bridge (Claude Code for now)

**File Operations:**
- Local vault only; no cloud sync
- Single vault path (no multiple vaults yet)
- Overwrites entire file (intelligent merge in Phase 1F)
- No file locking (user responsible for conflicts)

**User Management:**
- Single user (no collaboration features)
- No authentication
- Local file permissions determine access

**Data:**
- 200 contacts as initial target (scalable architecture)
- No data filtering or queries in CLI (Obsidian Dataview for that)
- No bidirectional sync to Clay (Phase 2+)
- No API rate limiting configurable (fixed delays)

### Phase 1F Constraints

**Merge Logic:**
- Dates in system sections regenerated (user dates in user sections only)
- System section order standardized
- Comments in markdown not preserved
- Custom YAML fields preserved but not updated

**Conflict Handling:**
- If Clay data changes, system sections regenerate
- No three-way merge (Clay, Obsidian user, previous state)
- User sections override any Clay updates
- Manual resolution required if system sections are edited

### Technical Constraints

**Language & Framework:**
- TypeScript/Node.js only (no Python, Go, etc.)
- Commander.js for CLI (no other CLI framework)
- fs-extra for file ops (no complex file watching)
- No external databases (plain files only)

**Performance:**
- Sync speed: ~1 contact per second
- Batch processing: 200 contacts in ~3-5 minutes
- File size: per-contact markdown ~2-3KB (2 contacts = 6KB)
- No pagination (all contact metadata in one file)

---

## 12. Out of Scope (Phase 2+)

### Clay Official MCP
- Mutation support (update, create, archive contacts)
- Duplicate detection and merging
- Advanced filtering and search
- Reminder management

### Bidirectional Sync
- Update Clay from Obsidian notes
- Two-way relationship management
- Conflict resolution strategy
- Automated field mapping

### Advanced Features
- Web UI or GUI (CLI only for Phase 1)
- Cloud sync or backup
- Real-time collaboration
- Permission management
- API for external tools (yet)

### Other Integrations
- Gmail/Outlook email sync
- Google Calendar integration
- Slack status updates
- CRM plugins
- Social media publishing

---

## 13. Roadmap

### Phase 1A: Data Models ✅
**Status:** Complete
**Deliverables:**
- Clay contact model from API spec
- Tend normalized contact model
- Sample fixture data
- Contact mapper with transformation logic

**Timeline:** Done

### Phase 1B: Markdown Generation ✅
**Status:** Complete
**Deliverables:**
- YAML frontmatter generator
- Body section generator (compact format)
- Template engine
- Sample markdown output

**Timeline:** Done

### Phase 1C: File Operations & CLI ✅
**Status:** Complete
**Deliverables:**
- Vault file manager
- CLI entry point with commander.js
- Sync command handler
- File writing and overwrite logic
- Filename sanitization

**Timeline:** Done

### Phase 1D: MCP Framework ✅
**Status:** Complete
**Deliverables:**
- MCP client structure
- clay-mcp wrapper skeleton
- Integration into sync command
- Error handling with guidance
- Fixture mode working

**Timeline:** Done

### Phase 1E: Batch Processing & Logging ⏳
**Status:** Planned
**Deliverables:**
- Input file parsing (one name per line)
- Batch processing loop
- Progress reporting
- Structured logging
- Configuration file support
- Error tracking and summary

**Timeline:** Next session

### Phase 1F: Parser & Intelligent Merge ⏳
**Status:** Planned
**Deliverables:**
- Markdown parser (read existing files)
- Section categorization (system vs user)
- Date entry detection (####YYYY-MM-DD)
- Intelligent merger
- Update command
- Validation command

**Timeline:** After Phase 1E

### Phase 2: Official MCP & TheBrain 🔮
**Status:** Future
**Deliverables:**
- Clay Official MCP support
- Advanced search and filtering
- TheBrain integration (UnBrain project)
- Bidirectional link creation
- Knowledge graph features

**Timeline:** Q2 2026+

### Phase 3: Advanced Features 🔮
**Status:** Future
**Deliverables:**
- Web UI dashboard
- Cloud backup option
- Advanced query system
- Relationship insights
- AI-powered analysis

**Timeline:** Q3 2026+

---

## 14. Non-Functional Requirements

### Performance
- **Sync time:** < 5 seconds per contact
- **Batch sync:** 200 contacts in < 10 minutes
- **Memory:** < 100MB for typical usage
- **Startup time:** < 1 second

### Reliability
- **Error recovery:** Continue on individual contact failures
- **Data integrity:** Never lose user edits
- **Backup:** User responsible (git recommended)
- **Logging:** All operations logged for debugging

### Usability
- **CLI clarity:** `--help` explains all options
- **Error messages:** Clear guidance on next steps
- **Documentation:** Comprehensive guides for common workflows
- **Discoverability:** Features obvious from `--help`

### Maintainability
- **Code organization:** Clear module separation
- **Type safety:** Full TypeScript with strict mode
- **Testing:** Unit tests for core logic
- **Documentation:** Comments for complex logic

### Security
- **No authentication:** Local tool, user responsible
- **No network:** Except MCP communication to Clay
- **Data privacy:** All files local, no cloud transmission
- **Input validation:** Sanitize filenames, validate JSON

### Compatibility
- **OS:** macOS, Linux, Windows (via WSL)
- **Node.js:** v18+
- **Obsidian:** v1.0+
- **Clay.earth:** Account with API access

---

## 15. Glossary

| Term | Definition |
|------|-----------|
| **Clay** | Clay.earth - contact management system |
| **MCP** | Model Context Protocol - tool communication standard |
| **Tend** | This tool (Contact → Obsidian sync) |
| **Obsidian** | Note-taking app with vault concept |
| **Vault** | Obsidian folder containing markdown files |
| **Contact** | Person, organization, or entity in Clay |
| **Sync** | Copy/update contact data from Clay to Obsidian |
| **System Sections** | Tend-managed markdown sections (regenerated) |
| **User Sections** | User-managed markdown sections (preserved) |
| **YAML** | Data format for frontmatter (metadata) |
| **Frontmatter** | YAML section at top of markdown file |
| **Dataview** | Obsidian plugin for querying markdown metadata |
| **CLI** | Command-line interface |

---

## 16. Appendix: Example Use Cases

### Use Case: Quarterly Relationship Review

**Goal:** Update all contacts with latest data from Clay while preserving personal notes

```bash
# 1. Create list of active contacts
cat > quarterly-review.txt << EOF
Harry Oppenheim
Jane Doe
John Smith
# ... 200 more contacts
EOF

# 2. Sync all (when Phase 1E is ready)
tend sync --input quarterly-review.txt --verbose

# 3. Review in Obsidian
# - Each file shows latest Clay data
# - Personal notes preserved
# - Interaction history updated
# - Can add new notes before next sync

# 4. Query for relationships needing attention
# Via Obsidian Dataview:
WHERE priority = "high" AND lastContact < date(2025-10-13)
```

### Use Case: New Contact Intake

**Goal:** Quick sync when meeting someone new

```bash
# 1. Add to Clay immediately (done in Clay UI)
# 2. Sync to Obsidian
tend sync --name "New Contact Name"

# 3. Markdown file created with:
# - Contact info from Clay
# - Empty Notes section ready
# - Empty Family Notes section ready
# - Interaction metrics

# 4. Add personal context
# - Edit Notes section
# - Add how you met
# - Record shared interests
# - Schedule follow-up in nextFollowup field
```

### Use Case: Power User Workflow

**Goal:** Deep relationship analysis and management

```
Daily:
1. Review Obsidian daily note
2. Mention new contacts met
3. Reference people via [[wikilinks]]

Weekly:
1. Check Dataview: "Contacts I haven't contacted in 30 days"
2. Send personal message to 2-3 people
3. Record interaction in date entry

Monthly:
1. tend sync --input monthly-list.txt
2. Review new interaction data
3. Update relationship notes

Quarterly:
1. Batch sync all 200 contacts
2. Review and update Family Notes
3. Analyze relationship patterns
```

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-01-13 | Design Phase | Initial planning |
| 1.0 | 2026-01-13 | Post Phase 1D | Complete spec |
| TBD | TBD | TBD | Phase 1E updates |

---

**Next Review:** After Phase 1E completion
