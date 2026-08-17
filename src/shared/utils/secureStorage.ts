/**
 * SECURITY: Secure storage utilities
 * - Uses sessionStorage instead of localStorage
 * - Validates keys against allowlist
 * - Size limits to prevent abuse
 */

// Allowed storage keys
const ALLOWED_KEYS = [
  "chat-citacoes",
  "csrf_token",
  "onboarding-completed",
  "chat-settings",
] as const;

type AllowedKey = typeof ALLOWED_KEYS[number];

const STORAGE_PREFIX = "app_";
const MAX_VALUE_LENGTH = 1000;
const MAX_TOTAL_ITEMS = 20;

/**
 * Secure storage wrapper using sessionStorage
 * - Cleared when tab/browser closes
 * - Not accessible via XSS in same way as localStorage
 */
export const secureStorage = {
  /**
   * Set an item in secure storage
   */
  setItem(key: AllowedKey, value: string): void {
    try {
      // Validate key
      if (!ALLOWED_KEYS.includes(key)) {
        throw new Error(`Invalid storage key: ${key}`);
      }

      // Validate value
      if (typeof value !== 'string') {
        throw new Error('Value must be a string');
      }

      if (value.length > MAX_VALUE_LENGTH) {
        throw new Error(`Value too large (max ${MAX_VALUE_LENGTH} chars)`);
      }

      // Check total items
      const currentCount = Object.keys(sessionStorage).filter(k => k.startsWith(STORAGE_PREFIX)).length;
      if (currentCount >= MAX_TOTAL_ITEMS) {
        console.warn('[Security] Storage limit reached, clearing old items');
        this.clearExpired();
      }

      sessionStorage.setItem(`${STORAGE_PREFIX}${key}`, value);
    } catch (error) {
      console.error('[Security] Storage write failed', { key });
      // Fail silently - don't expose errors to user
    }
  },

  /**
   * Get an item from secure storage
   */
  getItem(key: AllowedKey): string | null {
    try {
      if (!ALLOWED_KEYS.includes(key)) {
        throw new Error(`Invalid storage key: ${key}`);
      }

      return sessionStorage.getItem(`${STORAGE_PREFIX}${key}`);
    } catch (error) {
      console.error('[Security] Storage read failed', { key });
      return null;
    }
  },

  /**
   * Remove an item from secure storage
   */
  removeItem(key: AllowedKey): void {
    try {
      if (!ALLOWED_KEYS.includes(key)) {
        throw new Error(`Invalid storage key: ${key}`);
      }

      sessionStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    } catch (error) {
      console.error('[Security] Storage remove failed', { key });
    }
  },

  /**
   * Clear all app storage
   */
  clear(): void {
    try {
      const keys = Object.keys(sessionStorage);
      keys
        .filter(k => k.startsWith(STORAGE_PREFIX))
        .forEach(k => sessionStorage.removeItem(k));
    } catch (error) {
      console.error('[Security] Storage clear failed');
    }
  },

  /**
   * Clear expired/old items (placeholder for future TTL implementation)
   */
  clearExpired(): void {
    try {
      const keys = Object.keys(sessionStorage);
      keys
        .filter(k => k.startsWith(STORAGE_PREFIX))
        .forEach(k => sessionStorage.removeItem(k));
    } catch (error) {
      console.error('[Security] Storage cleanup failed');
    }
  },
};

/**
 * Convenience functions for specific keys
 */
export const chatSettings = {
  getCitacoes: (): boolean =>
    secureStorage.getItem("chat-citacoes") === "on",

  setCitacoes: (enabled: boolean): void =>
    secureStorage.setItem("chat-citacoes", enabled ? "on" : "off"),

  getOnboardingCompleted: (): boolean =>
    secureStorage.getItem("onboarding-completed") === "true",

  setOnboardingCompleted: (completed: boolean): void =>
    secureStorage.setItem("onboarding-completed", completed ? "true" : "false"),
};

export default secureStorage;