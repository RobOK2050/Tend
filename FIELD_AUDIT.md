# Field Audit: Complete Data Flow from Clay to Obsidian

## Issue
Bio and other fields from Clay were not appearing in synced markdown files.

## Root Cause
**Bio was missing from the Frontmatter YAML generation** despite being present in:
- ClayContact (API response)
- TendContact (internal model)
- Frontmatter interface definition

The field existed in the data pipeline but was never output to YAML.

## Fields Audit

### TIER 1: Always Included (High Priority)
These fields are always output if they have values:

**Identity & Status**
- ✓ `name` - Contact name
- ✓ `clayId` - Unique Clay identifier
- ✓ `type` - Contact type (person/organization)
- ✓ `status` - Active/dormant status
- ✓ `created` - When added to Clay
- ✓ `updated` - Last sync timestamp

**Contact Information**
- ✓ `email[]` - Email addresses
- ✓ `phone[]` - Phone numbers
- ✓ `location` - Geographic location
- ✓ `social{}` - Social media handles

**Professional Info**
- ✓ `title` - Job title
- ✓ `organization` - Company name
- ✓ `industry[]` - Industry tags

**Relationships**
- ✓ `communities[]` - Clay groups (now as clickable `[[wikilinks]]`)
- ✓ `tags[]` - Custom tags
- ✓ `priority` - User-set priority (high/medium/low)

**Metrics**
- ✓ `clayUrl` - Link to Clay contact
- ✓ `relationshipScore` - Interaction strength (0-100)
- ✓ `interactions{}` - Message, email, event counts

### TIER 2: Conditionally Included (Fixed)
These fields are now output when they have values:

**Personal Info**
- ✓ `bio` - Biography/headline [**NOW INCLUDED**]
- ✓ `birthday` - Birth date (shows month/day only)
- ✓ `interests[]` - Extracted from Clay notes by keyword
- ✓ `valuesAlignment[]` - User-managed field (preserved across syncs)

**Source Info**
- ✓ `clayCreated` - When contact created in Clay
- ✓ `clayIntegrations[]` - Connected services (LinkedIn, email, etc.)

### TIER 3: Output in Body (Not YAML)
These are rendered as markdown sections:

**Body Header**
- ✓ Name (H1)
- ✓ Bio (if present, in italics)
- ✓ Title + Organization
- ✓ Birthday (if present, in italics)

**Links Section**
- ✓ Email links
- ✓ Phone links
- ✓ Social media links
- ✓ Clay app link
- ✓ Brain wikilinks

**Notes Section**
- ✓ User notes (preserved from existing)
- ✓ User subsections (### headers preserved as content)
- ✓ Dated entries (#### YYYY-MM-DD entries, sorted descending)

**Work History**
- ✓ Company + title (current and past roles)

**Education**
- ✓ School + degree

**Interaction History**
- ✓ First/last contact dates
- ✓ Message, email, event counts

**Clay Notes**
- ✓ Notes from Clay API

## What Was Wrong

### Before
```yaml
---
name: Thomas Maybank
clayId: 45241433
# bio MISSING ← THIS WAS THE BUG
email: [...]
---
```

### After
```yaml
---
name: Thomas Maybank
clayId: 45241433
bio: "Biography from Clay (if present)"  ← NOW INCLUDED
email: [...]
---
```

## Implementation

**File Changes:**
1. `src/models/vault-file.ts` - Added `bio` to Frontmatter interface
2. `src/templates/frontmatter.ts` - Added bio to YAML output

**Preserved During Merges:**
- Non-Clay fields stay in YAML (user customizations)
- Communities are combined, not replaced
- Bio updates from Clay data only if it's not a user-customized field

## Testing

✓ All 34 tests passing
✓ 3-contact real-world sync verified
✓ Data flow: Clay API → TendContact → Frontmatter → Markdown ✓

## Notes

- Some Clay contacts may not have bio data (returns `null` from API)
- Bio appears in markdown body header when present
- Other fields like `interests` are extracted from Clay notes by keyword matching
- User-managed fields like `nextFollowup`, `valuesAlignment`, `priority` are preserved during merge
