import cron from 'node-cron';
import { supabase } from '../config/supabase.js';
import { correoHabilitado } from '../config/email.js';
import { obtenerVencimientos } from '../services/vencimientos.service.js';
import { crearNotificacion } from '../services/notificaciones.service.js';
import { enviarCorreo, plantillaDigestVencimientos, obtenerMapaEmails } from '../services/email.service.js';
import { cabeceraDeCentro, fechaLarga } from '../services/export/branding.js';

const DEDUPE_HORAS = 24 * 7;

export const ejecutarRevisionVencimientos = async () => {
    let items = [];
    try {
        items = await obtenerVencimientos();
    } catch (e) {
        console.error('[vencimientos] error consultando vencimientos:', e.message);
        return { items: 0, notifsCreadas: 0, correosEnviados: 0, error: e.message };
    }
    console.log(`[vencimientos] revision: ${items.length} documento(s) por vencer`);

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
                soloCentro: true,
            });
            notifsCreadas += r.cantidadCreada || 0;
        } catch (e) {
            console.warn('[vencimientos] no se pudo crear notif:', e.message);
        }
    }

    let correosEnviados = 0;
    if (correoHabilitado && items.length > 0) {
        const { data: admins } = await supabase
            .from('usuarios')
            .select('id, centro_id')
            .neq('rol', 'conductor')
            .eq('activo', true)
            .not('centro_id', 'is', null);
        const emailPorId = await obtenerMapaEmails();
        let sinEmail = 0;

        for (const admin of admins || []) {
            const email = emailPorId.get(admin.id);
            if (!email) { sinEmail++; continue; }
            const susItems = items.filter((it) => it.centro_id === admin.centro_id);
            if (susItems.length === 0) continue;
            const centroNombre = (await cabeceraDeCentro(admin.centro_id)).centroNombre;
            const html = plantillaDigestVencimientos({ items: susItems, centroNombre });
            const r = await enviarCorreo({
                para: email,
                asunto: `Documentos por vencer (${susItems.length})`,
                html,
            });
            if (r.enviado) correosEnviados++;
        }
        if (sinEmail > 0) {
            console.warn(`[vencimientos] ${sinEmail} coordinador(es) de centro sin email — no recibieron el resumen.`);
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
    if (typeof cron.validate === 'function' && !cron.validate(expr)) {
        console.error(`[vencimientos] CRON_VENCIMIENTOS invalido ("${expr}") — el aviso diario NO se programara. Revisa el .env.`);
        return;
    }
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
