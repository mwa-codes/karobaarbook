"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type AppSupabaseClient = SupabaseClient<Database>;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (typeof window !== "undefined") {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // eslint-disable-next-line no-console
    console.warn(
      "[KarobaarBook] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set. " +
        "Add them to .env.local — see .env.local.example."
    );
  }
}

let _client: AppSupabaseClient | null = null;

export function getSupabaseBrowser(): AppSupabaseClient {
  if (_client) return _client;
  _client = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _client;
}

export const supabase: AppSupabaseClient = getSupabaseBrowser();
