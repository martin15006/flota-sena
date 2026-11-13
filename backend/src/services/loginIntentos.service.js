import { supabase } from '../config/supabase.js';

const MAX_INTENTOS = 5;
const BLOQUEO_MINUTOS = 15;

export const estadoBloqueo = async (email) => {
    try {
        const { data, error } = await supabase
            .from('intentos_login')
            .select('bloqueado_hasta')
            .eq('email', email)
            .maybeSingle();

        if (error || !data || !data.bloqueado_hasta) {
            return { bloqueado: false, minutosRestantes: 0 };
        }
        const restanteMs = new Date(data.bloqueado_hasta).getTime() - Date.now();
        if (restanteMs > 0) {
            return { bloqueado: true, minutosRestantes: Math.ceil(restanteMs / 60000) };
        }
        return { bloqueado: false, minutosRestantes: 0 };
    } catch (e) {
        console.warn('[login-intentos] estadoBloqueo:', e.message);
        return { bloqueado: false, minutosRestantes: 0 };
    }
};

export const registrarFallo = async (email) => {
    try {
        const { data } = await supabase
            .from('intentos_login')
            .select('intentos')
            .eq('email', email)
            .maybeSingle();

        const intentos = (data?.intentos || 0) + 1;
        const ahora = new Date().toISOString();

        if (intentos >= MAX_INTENTOS) {
            const bloqueadoHasta = new Date(Date.now() + BLOQUEO_MINUTOS * 60000).toISOString();
            await supabase.from('intentos_login').upsert(
                { email, intentos: 0, bloqueado_hasta: bloqueadoHasta, actualizado_en: ahora },
                { onConflict: 'email' }
            );
            return { recienBloqueado: true, minutos: BLOQUEO_MINUTOS };
        }

        await supabase.from('intentos_login').upsert(
            { email, intentos, bloqueado_hasta: null, actualizado_en: ahora },
            { onConflict: 'email' }
        );
        return { recienBloqueado: false, minutos: 0 };
    } catch (e) {
        console.warn('[login-intentos] registrarFallo:', e.message);
        return { recienBloqueado: false, minutos: 0 };
    }
};

export const limpiarIntentos = async (email) => {
    try {
        await supabase.from('intentos_login').delete().eq('email', email);
    } catch (e) {
        console.warn('[login-intentos] limpiarIntentos:', e.message);
    }
};
