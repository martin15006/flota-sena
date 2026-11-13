import { supabase } from '../config/supabase.js';
import { poolsVigentesEnCentro } from './suplencias.service.js';

const ROLES_DESTINATARIOS = [
    'admin',
    'admin_centro',
    'admin_departamental',
    'superadmin',
];

export const resolverDestinatariosCentro = async (centro_id = null, { soloCentro = false } = {}) => {
    const { data: todosAdmins, error } = await supabase
        .from('usuarios')
        .select('id, centro_id')
        .neq('rol', 'conductor')
        .eq('activo', true);
    if (error) {
        console.error('[notificaciones] error obteniendo destinatarios:', error);
        return [];
    }
    const ids = (todosAdmins || [])
        .filter((u) => {
            if (!centro_id) return true;
            if (soloCentro) return u.centro_id === centro_id;
            return !u.centro_id || u.centro_id === centro_id;
        })
        .map((u) => u.id);

    if (centro_id) {
        const poolIds = await poolsVigentesEnCentro(centro_id);
        const set = new Set(ids);
        for (const poolId of poolIds) {
            if (poolId && !set.has(poolId)) { ids.push(poolId); set.add(poolId); }
        }
    }
    return ids;
};

export const crearNotificacion = async ({
    tipo,
    titulo,
    mensaje,
    url_destino = null,
    centro_id = null,
    chequeo_id = null,
    vehiculo_id = null,
    conductor_id = null,
    dedupeHoras = null,
    maxPorVentana = 1,
    soloCentro = false,
}) => {
    if (!tipo || !titulo || !mensaje) {
        throw new Error('tipo, titulo y mensaje son obligatorios');
    }

    if (dedupeHoras && (conductor_id || vehiculo_id)) {
        const desde = new Date(Date.now() - dedupeHoras * 60 * 60 * 1000).toISOString();
        let q = supabase
            .from('notificaciones')
            .select('id', { count: 'exact', head: true })
            .eq('tipo', tipo)
            .gte('created_at', desde);
        if (conductor_id) q = q.eq('conductor_id', conductor_id);
        if (vehiculo_id) q = q.eq('vehiculo_id', vehiculo_id);
        const { count } = await q;
        if (count && count >= maxPorVentana) {
            return { cantidadCreada: 0, omitidaPorLimite: true };
        }
    }

    const destinatarioIds = await resolverDestinatariosCentro(centro_id, { soloCentro });

    if (destinatarioIds.length === 0) {
        return { cantidadCreada: 0 };
    }

    const filas = destinatarioIds.map((id) => ({
        destinatario_id: id,
        tipo,
        titulo,
        mensaje,
        url_destino,
        chequeo_id,
        vehiculo_id,
        conductor_id,
    }));

    const { error: errInsert } = await supabase
        .from('notificaciones')
        .insert(filas);

    if (errInsert) {
        console.error('[notificaciones] error insertando:', errInsert);
        return { cantidadCreada: 0 };
    }

    return { cantidadCreada: filas.length };
};


export const crearNotificacionDirecta = async ({ destinatarioIds, tipo, titulo, mensaje, url_destino = null }) => {
    const ids = [...new Set((destinatarioIds || []).filter(Boolean))];
    if (!tipo || !titulo || !mensaje) throw new Error('tipo, titulo y mensaje son obligatorios');
    if (ids.length === 0) return { cantidadCreada: 0 };
    const filas = ids.map((id) => ({ destinatario_id: id, tipo, titulo, mensaje, url_destino }));
    const { error } = await supabase.from('notificaciones').insert(filas);
    if (error) {
        console.error('[notificaciones] error insert directo:', error);
        return { cantidadCreada: 0 };
    }
    return { cantidadCreada: filas.length };
};


export const listarMisNotificaciones = async ({
    destinatarioId,
    pagina = 1,
    limite = 20,
    soloNoLeidas = false,
}) => {
    const desde = (pagina - 1) * limite;
    const hasta = desde + limite - 1;

    let query = supabase
        .from('notificaciones')
        .select('*', { count: 'exact' })
        .eq('destinatario_id', destinatarioId)
        .order('created_at', { ascending: false })
        .range(desde, hasta);

    if (soloNoLeidas) {
        query = query.eq('leida', false);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    return {
        notificaciones: data || [],
        total: count || 0,
        pagina,
        limite,
    };
};


export const contarNoLeidas = async (destinatarioId) => {
    const { count, error } = await supabase
        .from('notificaciones')
        .select('id', { count: 'exact', head: true })
        .eq('destinatario_id', destinatarioId)
        .eq('leida', false);

    if (error) throw error;
    return count || 0;
};


export const marcarLeida = async (notifId, usuarioId) => {
    const ahora = new Date().toISOString();
    const { data, error } = await supabase
        .from('notificaciones')
        .update({ leida: true, leida_en: ahora })
        .eq('id', notifId)
        .eq('destinatario_id', usuarioId)
        .select()
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            return null;
        }
        throw error;
    }
    return data;
};


export const marcarTodasLeidas = async (usuarioId) => {
    const ahora = new Date().toISOString();
    const { error } = await supabase
        .from('notificaciones')
        .update({ leida: true, leida_en: ahora })
        .eq('destinatario_id', usuarioId)
        .eq('leida', false);

    if (error) throw error;
    return { ok: true };
};
