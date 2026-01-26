# Merge System: Critical Data Loss Fixes

## Issues Fixed

### 1. **Parser Was Dropping Unheadered Content** ✓
**Problem:** Content that wasn't under a `##` header (including preamble and notes from old files) was silently dropped during parsing.

**Fix:** Parser now captures preamble content and merges it into Notes section, preserving all existing content from external programs.

### 2. **User Sections Were Being Lost** ✓  
**Problem:** User-managed sections (like "Family Notes" or custom sections) were parsed and preserved but never written to the final merged markdown.

**Fix:** Added output of user sections in merge assembly (positioned between Notes and Clay sections).

### 3. **Subsections Were Split Into Separate Sections** ✓
**Problem:** Markdown like `## Notes` with `### Subsection` was incorrectly split into two separate sections, losing the hierarchy and scattering content.

**Fix:** Parser now treats `###` (and higher) as content within `##` sections, preserving markdown hierarchy.

### 4. **Clay Data Overwrote Everything** ✓
**Problem:** Merge strategy was too permissive - not updating Clay fields even when they changed in Clay API.

**Fix:** Updated to "smart merge": Clay-managed fields (name, title, email, etc.) always update from fresh data, user-managed fields (custom properties) are preserved.

### 5. **Communities From CSV Not Being Set** ✓
**Problem:** Code tried to set `contact.groups` instead of `contact.communities`, so CSV-provided group memberships were never applied.

**Fix:** Corrected to set `contact.communities` from CSV groups.

## Test Coverage

All 34 unit tests passing:
- ✓ Frontmatter merge strategy (Clay fields update, user fields preserved)
- ✓ Communities combining (not replacing)  
- ✓ Section preservation and ordering
- ✓ Parser handles preamble, subsections, date entries
- ✓ Integration tests for real-world merge scenarios

## Merge Behavior After Fixes

When re-syncing an existing contact:

1. **Notes preserved**: All existing user notes preserved exactly as written
2. **Subsections preserved**: `### Subsection` headers kept as part of Notes
3. **Clay fields updated**: Title, email, bio, etc. updated from Clay API  
4. **User customizations kept**: Custom YAML properties preserved
5. **Communities combined**: CSV groups + Clay groups merged (deduplicated)
6. **Structure maintained**: Proper ordering: Links → Notes/User Sections → Clay Sections

## Example: John Folkstead Merge

### Before Sync
```yaml
name: John Folkstead
communities: null
```

### Fresh Data (CSV + Clay)
```
CSV groups: ["myContacts"]
Clay name: John Folkstead
```

### After Merge
```yaml
name: John Folkstead
communities:
  - myContacts
```

With all existing notes and subsections preserved.

---

**Result**: Zero data loss, Clay data stays current, user customizations preserved.
