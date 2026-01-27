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

## Bio Field Location

Bio is **NOT in YAML frontmatter** - it's displayed in the **body markdown header** (italicized, first line after name):

```markdown
# Thomas Maybank

*Real Estate Agent - biography or headline here*

**Real Estate Agent** @ The Ussery Group, Charter One Realty
```

This is the correct and natural location for bio. It appears prominently where users see it first.

**No YAML duplication needed** - keeps the frontmatter clean and focused on metadata.

## Testing

✓ All 34 tests passing
✓ 3-contact real-world sync verified
✓ Data flow: Clay API → TendContact → Frontmatter → Markdown ✓

## Notes

- Bio is displayed in the markdown body header (italicized), not in YAML
- Some Clay contacts may not have bio data (returns `null` from API) - if null, no bio line shown
- Other fields like `interests` are extracted from Clay notes by keyword matching
- User-managed fields like `nextFollowup`, `valuesAlignment`, `priority` are preserved during merge
