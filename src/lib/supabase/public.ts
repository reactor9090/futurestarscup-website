import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseKey, supabaseUrl } from "./env";

// Client fără sesiune, pentru citirea datelor publice în funcții cu "use cache".
// Nu citește cookie-uri, deci rezultatul e același pentru toți vizitatorii.
export function createPublicClient() {
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
