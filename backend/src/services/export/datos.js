import { supabase } from '../../config/supabase.js';
import { obtenerChequeoCompleto } from '../chequeos.service.js';
import { obtenerVehiculoCompleto } from '../vehiculos.service.js';
import { puedeAccederCentro } from '../scope.service.js';
import { cabeceraDeCentro } from './branding.js';

// Junta TODO lo necesario para exportar un chequeo (reusa la capa de datos existente,
// respetando el scope del usuario). Devuelve { ok, error?, status?, chequeo, origen }.
export const datosChequeo = async (id, usuario) => {
    const resultado = await obtenerChequeoCompleto(id, usuario);
    if (resultado.error) {
        return { ok: false, status: resultado.error.status, error: resultado.error.mensaje };
    }
    const chequeo = resultado.chequeo;
    const origen = await cabeceraDeCentro(chequeo.centro_id);
    return { ok: true, chequeo, origen };
};

// Junta el vehiculo completo + sus ultimos chequeos cerrados, respetando el scope.
// Devuelve { ok, error?, status?, vehiculo, chequeos, origen }.
export const datosVehiculo = async (id, usuario) => {
    let vehiculo;
    try {
        vehiculo = await obtenerVehiculoCompleto(id);
    } catch {
        return { ok: false, status: 404, error: 'Vehículo no encontrado.' };
    }
    if (!vehiculo) return { ok: false, status: 404, error: 'Vehículo no encontrado.' };
    if (!(await puedeAccederCentro(usuario, vehiculo.centro_id))) {
        return { ok: false, status: 403, error: 'No tienes acceso a este vehículo.' };
    }

    const { data: chequeos } = await supabase
        .from('chequeos_preoperacionales')
        .select('id, fecha, tipo, es_oficial, resultado_estado, resultado_criticidad, cerrado, tiene_falla_critica, conductor:usuarios!chequeos_preoperacionales_conductor_id_fkey (nombre_completo)')
        .eq('vehiculo_id', id)
        .eq('cerrado', true)
        .order('fecha', { ascending: false })
        .limit(8);

    const origen = await cabeceraDeCentro(vehiculo.centro_id);
    return { ok: true, vehiculo, chequeos: chequeos || [], origen };
};
