// mswazi1/js/supabase.js — Supabase client initialization
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MSWAZI_CONFIG } from "./config.js";

const hasValidConfig =
  MSWAZI_CONFIG.supabaseUrl &&
  !MSWAZI_CONFIG.supabaseUrl.includes("YOUR-PROJECT-REF") &&
  MSWAZI_CONFIG.supabaseAnonKey &&
  !MSWAZI_CONFIG.supabaseAnonKey.includes("YOUR-PUBLIC-ANON-KEY");

if (!hasValidConfig) {
  console.warn("MSWAZI: Set SUPABASE_URL and SUPABASE_ANON_KEY in docker-compose.yml or js/config.js to connect to Supabase.");
}

export const supabase = createClient(
  MSWAZI_CONFIG.supabaseUrl,
  MSWAZI_CONFIG.supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  }
);