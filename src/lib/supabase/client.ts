"use client";

import { createClient } from "@supabase/supabase-js";
import { type Database } from "@/lib/database.types";

let browserClient: ReturnType<typeof createClient<Database>> | null = null;

export function createBrowserClient() {
  browserClient ??= createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  return browserClient;
}
