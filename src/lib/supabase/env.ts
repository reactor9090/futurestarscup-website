// Cheile Supabase vin din .env.local (vezi .env.example).
// Cheia publică (anon / publishable) e sigură în browser: accesul e limitat de RLS.
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
