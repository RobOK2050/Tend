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
 * Generate a markdown filename from a contact name
 */
export function generateFilename(contactName: string): string {
  const sanitized = sanitizeFilename(contactName);
  return `${sanitized}.md`;
}

