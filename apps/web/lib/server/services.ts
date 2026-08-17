import { createSupabaseAdmin, SupabaseAuthStore } from "@navi/database";
import { readAuthConfig } from "./config";

export function productionServices() {
  const config = readAuthConfig();
  return { config, authStore: new SupabaseAuthStore(createSupabaseAdmin(config.SUPABASE_URL, config.SUPABASE_SECRET_KEY)) };
}
