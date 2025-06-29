import { Injectable } from '@angular/core';

/**
 * Service for generating unique, predictable IDs for UI components
 * Uses a combination of component prefix and incremental counter for uniqueness
 */
@Injectable({
  providedIn: 'root'
})
export class IdGeneratorService {
  private counters = new Map<string, number>();

  /**
   * Generate a unique ID for a component type
   * @param prefix Component prefix (e.g., 'button', 'input', 'modal')
   * @param providedId Optional custom ID to use instead of generating one
   * @returns Unique ID string
   */
  generateId(prefix: string, providedId?: string): string {
    if (providedId) {
      // Validate provided ID doesn't contain special characters that could cause issues
      if (this.isValidId(providedId)) {
        return providedId;
      } else {
        console.warn(`Invalid ID provided: "${providedId}". Generating new ID.`);
      }
    }

    // Get or initialize counter for this prefix
    const currentCount = this.counters.get(prefix) || 0;
    const newCount = currentCount + 1;
    this.counters.set(prefix, newCount);

    return `${prefix}-${newCount}`;
  }

  /**
   * Validate if an ID is safe to use (no spaces, special chars that could cause CSS/JS issues)
   * @param id ID to validate
   * @returns true if ID is valid
   */
  private isValidId(id: string): boolean {
    // Check for valid HTML ID format:
    // - Must start with a letter
    // - Can contain letters, numbers, hyphens, underscores
    // - Cannot contain spaces or other special characters
    const validIdPattern = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
    return validIdPattern.test(id) && id.length > 0 && id.length <= 100;
  }
}
