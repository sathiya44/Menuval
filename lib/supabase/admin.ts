import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv, getSupabaseServiceRoleKey } from "@/lib/env";

export function createAdminClient() {
  const { url } = getSupabaseEnv();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  return createSupabaseClient(
    url,
    serviceRoleKey,
    {
      auth: {
        persistSession: false
      }
    }
  );
}
