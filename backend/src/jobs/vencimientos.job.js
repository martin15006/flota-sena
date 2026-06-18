// Job diario de vencimientos (node-cron).
//
// Cada manana: arma la lista de documentos por vencer, crea las notificaciones
// en la campanita (con dedup de 7 dias para no repetir a diario) y manda un
// correo-resumen por admin con lo que esta por vencer en su centro.
import cron from 'node-cron';
import { supabase } from '../config/supabase.js';
import { correoHabilitado } from '../config/email.js';
import { obtenerVencimientos } from '../services/vencimientos.service.js';
import { crearNotificacion } from '../services/notificaciones.service.js';
import { enviarCorreo, plantillaDigestVencimientos } from '../services/email.service.js';
import { cabeceraDeCentro, fechaLarga } from '../services/export/branding.js';

const DEDUPE_HORAS = 24 * 7; // no repetir el mismo aviso (mismo doc) en 7 dias

// Ejecuta una revision completa. Exportada para poder dispararla manualmente.
export const ejecutarRevisionVencimientos = async () => {
    const items = await obtenerVencimientos();
    console.log(`[vencimientos] revision: ${items.length} documento(s) por vencer`);

    // 1) Notificaciones en la campanita (una por item, fan-out a los admins del centro)
    let notifsCreadas = 0;
    for (const it of items) {
        const esVeh = Boolean(it.vehiculo_id);
        const estado = it.dias <= 0 ? 'esta VENCIDO' : `vence en ${it.dias} día${it.dias === 1 ? '' : 's'}`;
        try {
            const r = await crearNotificacion({
                tipo: it.tipo,
                titulo: `${it.categoria} por vencer`,
                mensaje: `${it.categoria} de ${esVeh ? `vehículo ${it.sujeto}` : it.sujeto} ${estado} (${fechaLarga(it.vence)}).`,
                url_destino: esVeh ? `/admin/vehiculos/${it.vehiculo_id}` : `/admin/usuarios/${it.conductor_id}`,
                centro_id: it.centro_id,
                vehiculo_id: it.vehiculo_id || null,
                conductor_id: it.conductor_id || null,
                dedupeHoras: DEDUPE_HORAS,
                maxPorVentana: 1,
            });
            notifsCreadas += r.cantidadCreada || 0;
        } catch (e) {
            console.warn('[vencimientos] no se pudo crear notif:', e.message);
        }
    }

    // 2) Correo-resumen por admin (solo si el correo esta habilitado)
    let correosEnviados = 0;
    if (correoHabilitado && items.length > 0) {
        const { data: admins } = await supabase
            .from('usuarios')
            .select('id, centro_id')
            .neq('rol', 'conductor')
            .eq('activo', true);
        const { data: authData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const emailPorId = new Map((authData?.users || []).map((u) => [u.id, u.email]));

        for (const admin of admins || []) {
            const email = emailPorId.get(admin.id);
            if (!email) continue;
            // admin global (sin centro) ve todo; admin de centro ve solo el suyo
            const susItems = items.filter((it) => !admin.centro_id || it.centro_id === admin.centro_id);
            if (susItems.length === 0) continue;
            const centroNombre = admin.centro_id ? (await cabeceraDeCentro(admin.centro_id)).centroNombre : '';
            const html = plantillaDigestVencimientos({ items: susItems, centroNombre });
            const r = await enviarCorreo({
                para: email,
                asunto: `Documentos por vencer (${susItems.length})`,
                html,
            });
            if (r.enviado) correosEnviados++;
        }
    } else if (!correoHabilitado) {
        console.log('[vencimientos] correo deshabilitado: solo se llenó la campanita');
    }

    const resumen = { items: items.length, notifsCreadas, correosEnviados };
    console.log('[vencimientos] listo:', resumen);
    return resumen;
};

let tarea = null;

export const iniciarCronVencimientos = () => {
    const expr = process.env.CRON_VENCIMIENTOS || '0 7 * * *';
    try {
        tarea = cron.schedule(
            expr,
            () => { ejecutarRevisionVencimientos().catch((e) => console.error('[vencimientos] error en cron:', e.message)); },
            { timezone: 'America/Bogota' }
        );
        console.log(`[vencimientos] cron programado: "${expr}" (America/Bogota)`);
    } catch (e) {
        console.warn(`[vencimientos] no se pudo programar el cron ("${expr}"):`, e.message);
    }
};

export const detenerCronVencimientos = () => {
    if (tarea) { tarea.stop(); tarea = null; }
};
