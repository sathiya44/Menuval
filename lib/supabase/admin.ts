import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getSupabaseEnv, getSupabaseServiceRoleKey } from "@/lib/env";

export function createAdminClient() {
  const { url } = getSupabaseEnv();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  return createSupabaseClient<Database>(
    url,
    serviceRoleKey,
    {
      auth: {
        persistSession: false
      }
    }
  );
}
