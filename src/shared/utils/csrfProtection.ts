/**
 * SECURITY: CSRF Protection utilities
 * - Generates and validates CSRF tokens
 * - Adds tokens to all mutating requests
 */

let csrfToken: string | null = null;

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
  if (csrfToken) return csrfToken;

  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  csrfToken = Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");

  // Store in session storage
  if (typeof window !== "undefined") {
    sessionStorage.setItem("csrf_token", csrfToken);
  }

  return csrfToken;
}

/**
 * Get current CSRF token (generates if not exists)
 */
export function getCSRFToken(): string {
  if (!csrfToken && typeof window !== "undefined") {
    csrfToken = sessionStorage.getItem("csrf_token");
  }
  if (!csrfToken) {
    return generateCSRFToken();
  }
  return csrfToken;
}

/**
 * Validate CSRF token (timing-safe comparison)
 */
export async function validateCSRFToken(token: string | null | undefined): Promise<boolean> {
  if (!token) return false;

  const stored = getCSRFToken();
  if (!stored) return false;

  try {
    const encoder = new TextEncoder();
    const tokenBuffer = encoder.encode(token);
    const storedBuffer = encoder.encode(stored);

    // Ensure same length
    if (tokenBuffer.length !== storedBuffer.length) return false;

    // Timing-safe comparison
    let result = 0;
    for (let i = 0; i < tokenBuffer.length; i++) {
      result |= tokenBuffer[i] ^ storedBuffer[i];
    }

    return result === 0;
  } catch {
    return false;
  }
}

/**
 * Initialize CSRF protection on app startup
 */
export function initializeCSRFProtection(): void {
  if (typeof window !== "undefined") {
    generateCSRFToken();
  }
}

/**
 * Fetch wrapper that adds CSRF token to mutating requests
 */
export function secureFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const method = (init?.method || "GET").toUpperCase();

  // Add CSRF token for mutating methods
  if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    const token = getCSRFToken();

    init = {
      ...init,
      headers: {
        ...init?.headers,
        "X-CSRF-Token": token,
      },
    };
  }

  return fetch(input, init);
}
