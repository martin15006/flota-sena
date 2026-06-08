// Cliente de Supabase para el FRONTEND.
// Se usa UNICAMENTE para Realtime (suscripcion a notificaciones en vivo).
// Todo lo demas (CRUD, auth) sigue pasando por nuestro backend via api.js.
//
// Usa la ANON KEY (publica, segura para el navegador), nunca la service_role.
// Las variables vienen de frontend/.env con prefijo VITE_ (requisito de Vite).

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Si faltan las variables, exportamos null y el codigo que lo use debe
// degradar elegantemente al polling (no rompe la app).
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
