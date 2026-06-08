// Servicio de notificaciones (Bloque C).
//
// Define el helper crearNotificacion(...) que se usa desde los controllers
// de chequeos (cuando ocurre un evento como abandono, chequeo no operativo,
// intento bloqueado, etc).
//
// Decision de diseño: la notificacion va a TODOS los admins activos del
// centro afectado. Asi cualquiera de ellos puede atenderla sin que dependa
// de uno solo. Cuando uno la marca como leida, se marca solo para ese.

import { supabase } from '../config/supabase.js';

// Roles que pueden recibir notificaciones administrativas.
// Por ahora todos los admins; cuando implementemos multinivel (Tarea #102)
// podemos filtrar por jerarquia.
const ROLES_DESTINATARIOS = [
    'admin',
    'admin_centro',
    'admin_ciudad',
    'admin_departamental',
    'admin_regional',
    'superadmin',
];

// crearNotificacion: crea una entrada de notificacion para cada admin que aplique.
//
// Parametros:
//   tipo         — uno de los valores permitidos en el CHECK constraint de la tabla
//   titulo       — texto corto que aparece en la lista
//   mensaje      — descripcion mas larga
//   url_destino  — a donde llevar al admin si hace clic (opcional)
//   centro_id    — si esta dado, solo notifica a admins de ese centro (multi-tenant)
//                  si es null, notifica a todos los admins activos
//   contexto     — { chequeo_id?, vehiculo_id?, conductor_id? }
//
// Devuelve { cantidadCreada: N } o lanza error si algo falla.
export const crearNotificacion = async ({
    tipo,
    titulo,
    mensaje,
    url_destino = null,
    centro_id = null,
    chequeo_id = null,
    vehiculo_id = null,
    conductor_id = null,
}) => {
    if (!tipo || !titulo || !mensaje) {
        throw new Error('tipo, titulo y mensaje son obligatorios');
    }

    // Traer TODOS los admins activos y filtrar el destinatario en JS, porque la
    // regla de scope es mas matizada que un simple .eq():
    //   - notificacion sin centro          -> va a todos los admins
    //   - admin SIN centro asignado (global)-> recibe todo (es el admin general)
    //   - admin CON centro asignado         -> solo si coincide con el del evento
    // Asi el admin principal (que normalmente no tiene centro) nunca se queda sin
    // recibir notificaciones, pero un admin_centro solo ve las de su centro.
    //
    // IMPORTANTE: usamos .neq('rol', 'conductor') en vez de .in(lista de roles admin)
    // porque la columna rol es un ENUM en la BD (rol_usuario) que por ahora solo
    // contiene 'admin' y 'conductor'. Si listaramos roles que aun no existen en el
    // enum (admin_centro, admin_ciudad, etc., previstos para el multinivel futuro)
    // Postgres lanza error 22P02. "Todos los que no son conductor" = todos los admins,
    // y es robusto sin importar que roles existan en el enum.
    const { data: todosAdmins, error: errDest } = await supabase
        .from('usuarios')
        .select('id, rol, centro_id')
        .neq('rol', 'conductor')
        .eq('activo', true);

    if (errDest) {
        console.error('[notificaciones] error obteniendo destinatarios:', errDest);
        return { cantidadCreada: 0 };
    }

    const destinatarios = (todosAdmins || []).filter((u) => {
        if (!centro_id) return true;       // evento sin centro -> todos
        if (!u.centro_id) return true;     // admin global -> recibe todo
        return u.centro_id === centro_id;  // admin de centro -> solo el suyo
    });

    if (destinatarios.length === 0) {
        // No hay a quien notificar — no es un error, solo no se crea nada
        return { cantidadCreada: 0 };
    }

    // Construir una fila por destinatario
    const filas = destinatarios.map((d) => ({
        destinatario_id: d.id,
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


// listarMisNotificaciones: lista paginada para el admin logueado.
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


// contarNoLeidas: solo el numero (para el badge de la campanita).
export const contarNoLeidas = async (destinatarioId) => {
    const { count, error } = await supabase
        .from('notificaciones')
        .select('id', { count: 'exact', head: true })
        .eq('destinatario_id', destinatarioId)
        .eq('leida', false);

    if (error) throw error;
    return count || 0;
};


// marcarLeida: marca una notificacion como leida (solo si es del usuario).
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
            // No encontrada (o no es del usuario)
            return null;
        }
        throw error;
    }
    return data;
};


// marcarTodasLeidas: marca TODAS las del usuario como leidas.
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
