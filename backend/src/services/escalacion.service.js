import { supabase } from '../config/supabase.js';
import { rolEfectivo } from './jerarquia.service.js';
import { obtenerScope, aplicarScope } from './scope.service.js';
import { emailsDeUsuarios, enviarCorreo, plantillaInforme } from './email.service.js';
import { crearNotificacionDirecta } from './notificaciones.service.js';
import { cabeceraDeCentro, etiquetaCargo } from './export/branding.js';

const idsActivos = async (filtro) => {
    const { data } = await filtro;
    return (data || []).map((u) => u.id);
};

export const resolverSuperior = async (usuario) => {
    const rol = rolEfectivo(usuario);
    if (rol === 'superadmin') return { ids: [], etiqueta: null, sinSuperior: true };

    const superadmins = () => idsActivos(
        supabase.from('usuarios').select('id').eq('rol', 'superadmin').eq('activo', true)
    );

    if (rol === 'admin_departamental') {
        return { ids: await superadmins(), etiqueta: 'la Dirección Nacional' };
    }

    const centroId = usuario.centroActivo || usuario.centro_id;
    if (!centroId) {
        return { ids: await superadmins(), etiqueta: 'la Dirección Nacional' };
    }
    const { data: centro } = await supabase
        .from('centros_formacion')
        .select('ciudad:ciudad_id ( departamento:departamento_id ( id, nombre ) )')
        .eq('id', centroId)
        .maybeSingle();
    const depto = centro?.ciudad?.departamento;
    if (depto?.id) {
        const ids = await idsActivos(
            supabase.from('usuarios').select('id').eq('rol', 'admin_departamental').eq('departamento_id', depto.id).eq('activo', true)
        );
        if (ids.length > 0) return { ids, etiqueta: `el Director Regional de ${depto.nombre}` };
    }
    return { ids: await superadmins(), etiqueta: 'la Dirección Nacional' };
};

const areaDelUsuario = async (usuario) => {
    const centroId = usuario.centroActivo || usuario.centro_id;
    if (centroId) return (await cabeceraDeCentro(centroId)).centroNombre;
    if (usuario.departamento_id) {
        const { data } = await supabase.from('departamentos').select('nombre').eq('id', usuario.departamento_id).maybeSingle();
        return data?.nombre ? `Regional ${data.nombre}` : '';
    }
    return '';
};

export const resumenDeArea = async (usuario) => {
    const scope = await obtenerScope(usuario);
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const iso = hoy.toISOString();
    const con = (q) => aplicarScope(q, scope);
    const [veh, crit, noop, cheq] = await Promise.all([
        con(supabase.from('vehiculos').select('id', { count: 'exact', head: true }).eq('activo', true)),
        con(supabase.from('vehiculos').select('id', { count: 'exact', head: true }).eq('activo', true).eq('estado', 'critico')),
        con(supabase.from('vehiculos').select('id', { count: 'exact', head: true }).eq('activo', true).eq('estado', 'no_operativo')),
        con(supabase.from('chequeos_preoperacionales').select('id', { count: 'exact', head: true }).gte('fecha', iso)),
    ]);
    return {
        vehiculos: veh.count || 0,
        criticos: crit.count || 0,
        noOperativos: noop.count || 0,
        chequeosHoy: cheq.count || 0,
    };
};

export const enviarInforme = async ({ usuario, asunto, mensaje, incluirResumen }) => {
    if (!mensaje || !mensaje.trim()) {
        return { ok: false, status: 400, error: 'El mensaje es obligatorio.' };
    }
    const superior = await resolverSuperior(usuario);
    if (superior.sinSuperior) {
        return { ok: false, status: 400, error: 'No tienes un superior al cual escalar.' };
    }
    if (superior.ids.length === 0) {
        return { ok: false, status: 404, error: 'No se encontró un superior activo para escalar.' };
    }

    const resumen = incluirResumen ? await resumenDeArea(usuario) : null;
    const asuntoLimpio = (asunto || '').trim() || 'Informe';
    const cargo = etiquetaCargo(usuario.rol, usuario.es_pool);
    const area = await areaDelUsuario(usuario);

    let correoEnviado = false;
    try {
        const para = await emailsDeUsuarios(superior.ids);
        const html = plantillaInforme({ deQuien: usuario.nombre_completo, cargo, area, asunto: asuntoLimpio, mensaje, resumen });
        const r = await enviarCorreo({ para, asunto: `Informe: ${asuntoLimpio}`, html });
        correoEnviado = r.enviado === true;
    } catch {
        correoEnviado = false;
    }

    const notaCorreo = correoEnviado
        ? ' · 📧 También te llegó una copia a tu correo.'
        : '';
    await crearNotificacionDirecta({
        destinatarioIds: superior.ids,
        tipo: 'informe_escalado',
        titulo: `${usuario.nombre_completo} te envió un informe`,
        mensaje: `${asuntoLimpio}${notaCorreo}`,
        url_destino: '/admin/notificaciones',
    });

    return { ok: true, superior: superior.etiqueta, correoEnviado, notificados: superior.ids.length };
};
