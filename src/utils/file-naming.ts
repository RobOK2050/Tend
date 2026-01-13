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

/**
 * Generate a unique filename by adding a numeric suffix if the base name exists
 * Used for handling duplicate names in the vault
 */
export function generateUniqueFilename(
  baseFilename: string,
  existingFilenames: Set<string>
): string {
  if (!existingFilenames.has(baseFilename)) {
    return baseFilename;
  }

  // File exists, add numeric suffix
  const parts = baseFilename.split('.');
  const extension = parts.pop() || '';
  const nameWithoutExt = parts.join('.');

  let counter = 2;
  while (true) {
    const newFilename = `${nameWithoutExt}-${counter}.${extension}`;
    if (!existingFilenames.has(newFilename)) {
      return newFilename;
    }
    counter++;
  }
}
