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
   * Generate a unique ID with timestamp for extra uniqueness
   * Useful for dynamic components that might be created simultaneously
   * @param prefix Component prefix
   * @param providedId Optional custom ID
   * @returns Unique ID string with timestamp
   */
  generateTimestampedId(prefix: string, providedId?: string): string {
    if (providedId && this.isValidId(providedId)) {
      return providedId;
    }

    const timestamp = Date.now().toString(36); // Base 36 for shorter string
    const counter = this.getNextCounter(prefix);
    return `${prefix}-${timestamp}-${counter}`;
  }

  /**
   * Generate a unique ID using crypto.randomUUID if available, fallback to timestamp
   * @param prefix Component prefix
   * @param providedId Optional custom ID
   * @returns Unique ID string
   */
  generateSecureId(prefix: string, providedId?: string): string {
    if (providedId && this.isValidId(providedId)) {
      return providedId;
    }

    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      // Use crypto.randomUUID for strong uniqueness
      const uuid = crypto.randomUUID().replace(/-/g, '').substring(0, 8);
      return `${prefix}-${uuid}`;
    } else {
      // Fallback to timestamp-based generation
      return this.generateTimestampedId(prefix);
    }
  }

  /**
   * Reset counter for a specific prefix
   * @param prefix Component prefix to reset
   */
  resetCounter(prefix: string): void {
    this.counters.delete(prefix);
  }

  /**
   * Reset all counters
   */
  resetAllCounters(): void {
    this.counters.clear();
  }

  /**
   * Get current counter value for a prefix
   * @param prefix Component prefix
   * @returns Current counter value
   */
  getCurrentCounter(prefix: string): number {
    return this.counters.get(prefix) || 0;
  }

  /**
   * Get next counter value for a prefix without incrementing
   * @param prefix Component prefix
   * @returns Next counter value
   */
  private getNextCounter(prefix: string): number {
    const currentCount = this.counters.get(prefix) || 0;
    const newCount = currentCount + 1;
    this.counters.set(prefix, newCount);
    return newCount;
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

  /**
   * Create scoped ID generator for a specific component instance
   * @param componentName Name of the component
   * @returns Scoped ID generator function
   */
  createScopedGenerator(componentName: string) {
    return (elementType: string, providedId?: string) => {
      const prefix = `${componentName}-${elementType}`;
      return this.generateId(prefix, providedId);
    };
  }

  /**
   * Generate aria-describedby ID for accessibility
   * @param baseId Base ID of the component
   * @param suffix Descriptive suffix (e.g., 'help', 'error', 'description')
   * @returns Aria-describedby ID
   */
  generateAriaId(baseId: string, suffix: string): string {
    return `${baseId}-${suffix}`;
  }

  /**
   * Generate form control group IDs for accessibility
   * @param baseId Base ID of the form control
   * @returns Object with related IDs for form controls
   */
  generateFormControlIds(baseId: string) {
    return {
      input: baseId,
      label: this.generateAriaId(baseId, 'label'),
      help: this.generateAriaId(baseId, 'help'),
      error: this.generateAriaId(baseId, 'error'),
      description: this.generateAriaId(baseId, 'description')
    };
  }
}