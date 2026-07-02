import { createClient } from "@supabase/supabase-js";
import { type Database } from "@/lib/database.types";

// No Supabase Auth in this app (honor-system game), so a plain client with
// the publishable key is all server code needs.
export function createServerClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
}
