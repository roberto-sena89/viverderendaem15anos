/**
 * SECURITY: Supabase client with secure environment variable handling
 * - No secrets exposed in error messages
 * - No secrets in console output
 * - Build-time validation only
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      try {
        new Headers(init.headers).forEach((value, key) => headers.set(key, value));
      } catch (error) {
        console.warn("Failed to parse headers (redacted for security)");
        // Fallback: se headers for objeto simples
        if (typeof init.headers === 'object' && !Array.isArray(init.headers)) {
          Object.entries(init.headers).forEach(([key, value]) => {
            if (typeof value === 'string') {
              headers.set(key, value);
            }
          });
        }
      }
    }

    // New Supabase API keys are opaque strings, not bearer JWTs.
    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

/**
 * Validate required environment variables at build time
 * In production, this check is skipped for security
 */
function validateEnvironmentVariables(): void {
  // Only validate in development mode to avoid leaking config details
  if (process.env.NODE_ENV === "development") {
    const REQUIRED_VARS = [
      "VITE_SUPABASE_URL",
      "VITE_SUPABASE_PUBLISHABLE_KEY"
    ] as const;

    const missing = REQUIRED_VARS.filter(
      key => !import.meta.env[key as keyof ImportMetaEnv]
    );

    if (missing.length > 0) {
      throw new Error(
        "[Security] Supabase configuration incomplete. Contact your administrator."
      );
    }
  }
}

function createSupabaseClient() {
  // Validate environment (development only)
  validateEnvironmentVariables();

  // Use Vite environment variables only (build-time replacement, safe for production)
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  // Generic error message - doesn't reveal which specific variable is missing
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      "[Security] Supabase configuration incomplete. Contact your administrator."
    );
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
    },
    auth: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver) as ReturnType<typeof createSupabaseClient>;
  },
});
