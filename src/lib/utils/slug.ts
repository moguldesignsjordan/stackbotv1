/**
 * Slug utilities for StackBot
 * Generates URL-safe slugs for vendors and products
 */

/**
 * Generates a URL-safe slug from a string
 * @example generateSlug("Soberana Cobra Store!") => "soberana-cobra-store"
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Remove protocol and www from URLs
    .replace(/^(https?:\/\/)?(www\.)?/i, "")
    // Remove domain extensions
    .replace(/\.(com|net|org|co|io|shop|store|app|do|pr|us|uk|ca)$/i, "")
    // Replace accented characters
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, "-")
    // Remove all non-alphanumeric characters except hyphens
    .replace(/[^a-z0-9-]/g, "")
    // Remove multiple consecutive hyphens
    .replace(/-+/g, "-")
    // Remove leading/trailing hyphens
    .replace(/^-|-$/g, "");
}

/**
 * Checks if a string looks like a URL (common mistake in slug field)
 */
export function isUrlLike(text: string): boolean {
  const urlPatterns = [
    /^https?:\/\//i,
    /^www\./i,
    /\.(com|net|org|co|io|shop|store|app|do|pr|us|uk|ca)$/i,
    /\.(com|net|org|co|io|shop|store|app|do|pr|us|uk|ca)\//i,
  ];
  return urlPatterns.some((pattern) => pattern.test(text));
}

/**
 * Sanitizes a slug - fixes common issues like URLs entered as slugs
 * @example sanitizeSlug("Www.soberanacobra.com") => "soberanacobra"
 */
export function sanitizeSlug(slug: string): string {
  if (!slug) return "";
  
  // If it looks like a URL, extract the meaningful part
  if (isUrlLike(slug)) {
    return generateSlug(slug);
  }
  
  // Otherwise just clean it up
  return slug
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Generates a unique slug by appending a number if needed
 * @param baseSlug - The base slug to use
 * @param existingSlugs - Array of existing slugs to check against
 */
export function generateUniqueSlug(baseSlug: string, existingSlugs: string[]): string {
  const slug = generateSlug(baseSlug);
  
  if (!existingSlugs.includes(slug)) {
    return slug;
  }
  
  // Find the next available number
  let counter = 2;
  while (existingSlugs.includes(`${slug}-${counter}`)) {
    counter++;
  }
  
  return `${slug}-${counter}`;
}

/**
 * Validates a slug format
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || slug.length < 2 || slug.length > 100) {
    return false;
  }
  
  // Must be lowercase alphanumeric with hyphens only
  const validPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  return validPattern.test(slug);
}

/**
 * Extracts business name from a URL-like string
 * @example extractNameFromUrl("www.soberanacobra.com") => "Soberanacobra"
 */
export function extractNameFromUrl(url: string): string {
  const slug = generateSlug(url);
  // Capitalize first letter
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}