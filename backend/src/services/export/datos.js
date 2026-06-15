import { obtenerChequeoCompleto } from '../chequeos.service.js';
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
