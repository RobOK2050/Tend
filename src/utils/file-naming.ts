/**
 * File Naming Utilities - sanitize and validate filenames for vault
 */

/**
 * Sanitize a contact name to be a valid filename
 * - Remove/replace invalid filesystem characters
 * - Preserve spaces for readability
 * - Handle duplicate filenames
 */
export function sanitizeFilename(name: string): string {
  // Remove leading/trailing whitespace
  let sanitized = name.trim();

  // Replace problematic characters with nothing or underscore
  // Invalid in most filesystems: < > : " / \ | ? *
  sanitized = sanitized.replace(/[<>:"/\\|?*]/g, '');

  // Replace multiple spaces with single space
  sanitized = sanitized.replace(/\s+/g, ' ');

  // Remove leading/trailing dots and spaces again after replacements
  sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '');

  // Limit filename length (leaving room for .md extension)
  const maxLength = 200; // Reasonable limit, well below filesystem limits
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength).trim();
  }

  return sanitized;
}

/**
 * Extract credentials from a name (e.g., "AIA, NCARB" from "Evan Goodwin, AIA, NCARB")
 * Returns { baseName, credentials }
 */
export function extractCredentials(fullName: string): { baseName: string; credentials: string } {
  // Pattern: look for comma followed by uppercase letters/periods/commas
  // Also handles parenthetical credentials like (OJP)
  const credentialPattern = /,\s*([A-Z][A-Z\s,.-]*(?:\([^)]+\))?)$/;
  const match = fullName.match(credentialPattern);

  if (match) {
    const baseName = fullName.substring(0, match.index).trim();
    const credentials = match[1].trim();
    return { baseName, credentials };
  }

  return { baseName: fullName, credentials: '' };
}

/**
 * Generate a markdown filename from a contact name (strips credentials)
 */
export function generateFilename(contactName: string): string {
  const { baseName } = extractCredentials(contactName);
  const sanitized = sanitizeFilename(baseName);
  return `${sanitized}.md`;
}

