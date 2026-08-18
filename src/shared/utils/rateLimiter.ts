/**
 * SECURITY: Rate limiting with sliding window
 * Prevents DoS and abuse attacks
 */

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

interface RateLimitEntry {
  tokens: number;
  resetTime: number;
}

/**
 * In-memory rate limiter with sliding window
 * Note: For production with multiple instances, use Redis-based rate limiting
 */
export class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig = { windowMs: 60000, maxRequests: 20 }) {
    this.config = config;

    // Cleanup old entries periodically
    setInterval(() => this.cleanup(), this.config.windowMs);
  }

  /**
   * Check if request is allowed for the given key
   * @param key Unique identifier (e.g., "chat:user-id")
   * @returns true if allowed, false if rate limited
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const entry = this.store.get(key);

    // No entry or expired window - create new
    if (!entry || now > entry.resetTime) {
      this.store.set(key, {
        tokens: this.config.maxRequests - 1,
        resetTime: now + this.config.windowMs,
      });
      return true;
    }

    // Tokens available
    if (entry.tokens > 0) {
      entry.tokens--;
      return true;
    }

    // Rate limited
    return false;
  }

  /**
   * Get remaining time until rate limit resets
   * @param key Unique identifier
   * @returns Milliseconds until reset (0 if not limited)
   */
  getRemainingTime(key: string): number {
    const entry = this.store.get(key);
    if (!entry) return 0;
    return Math.max(0, entry.resetTime - Date.now());
  }

  /**
   * Get remaining tokens for a key
   * @param key Unique identifier
   * @returns Remaining tokens (0 if not found)
   */
  getRemainingTokens(key: string): number {
    const entry = this.store.get(key);
    if (!entry) return this.config.maxRequests;
    return Math.max(0, entry.tokens);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Reset rate limit for a key (admin only)
   */
  reset(key: string): void {
    this.store.delete(key);
  }
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const rateLimiters = {
  // Chat messages: 20 per minute
  chat: new RateLimiter({ windowMs: 60000, maxRequests: 20 }),

  // File uploads: 10 per minute
  fileUpload: new RateLimiter({ windowMs: 60000, maxRequests: 10 }),

  // AI requests: 15 per minute
  aiRequest: new RateLimiter({ windowMs: 60000, maxRequests: 15 }),

  // Auth attempts: 5 per minute
  auth: new RateLimiter({ windowMs: 60000, maxRequests: 5 }),

  // General API: 100 per minute
  api: new RateLimiter({ windowMs: 60000, maxRequests: 100 }),
};

/**
 * Helper to get user-specific rate limit key
 */
export function getRateLimitKey(prefix: string, userId: string): string {
  return `${prefix}:${userId}`;
}

/**
 * Express-style middleware helper for server functions
 */
export function createRateLimitMiddleware(limiter: RateLimiter, keyPrefix: string) {
  return async (context: { userId?: string }) => {
    if (!context.userId) {
      return { allowed: true }; // Skip if no user (shouldn't happen in protected routes)
    }

    const key = getRateLimitKey(keyPrefix, context.userId);
    const allowed = limiter.isAllowed(key);

    if (!allowed) {
      const remainingMs = limiter.getRemainingTime(key);
      const remainingSecs = Math.ceil(remainingMs / 1000);

      return {
        allowed: false,
        retryAfter: remainingSecs,
        message: `Rate limit exceeded. Please wait ${remainingSecs} seconds.`,
      };
    }

    return { allowed: true };
  };
}
