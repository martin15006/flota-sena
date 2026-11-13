import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseRealtime =
    url && anonKey
        ? createClient(url, anonKey, {
              auth: { persistSession: false, autoRefreshToken: false },
              realtime: { params: { eventsPerSecond: 5 } },
          })
        : null;

if (!supabaseRealtime) {
    console.warn(
        "[realtime] Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. " +
        "Las notificaciones funcionaran solo con polling."
    );
}
