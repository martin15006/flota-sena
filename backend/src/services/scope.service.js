import { supabase } from '../config/supabase.js';
import { rolEfectivo } from './jerarquia.service.js';

const UUID_IMPOSIBLE = '00000000-0000-0000-0000-000000000000';

export const obtenerScope = async (usuario) => {
    const rol = rolEfectivo(usuario);

    if (rol === 'superadmin') {
        return { tipo: 'global' };
    }

    const vacio = {
        tipo: 'centros',
        regionIds: [],
        departamentoIds: [],
        ciudadIds: [],
        centroIds: [],
    };

    if (usuario?.rol === 'conductor' && usuario?.es_pool === true && usuario?.suplencia) {
        return { ...vacio, centroIds: usuario.centroActivo ? [usuario.centroActivo] : [] };
    }

    if (rol === 'admin_centro' || rol === 'conductor') {
        return {
            ...vacio,
            centroIds: usuario.centro_id ? [usuario.centro_id] : [],
        };
    }

    if (rol === 'admin') {
        if (usuario.centro_id) {
            return { ...vacio, centroIds: [usuario.centro_id] };
        }
        return { tipo: 'global' };
    }

    if (rol === 'admin_departamental') {
        if (!usuario.departamento_id) return vacio;
        const { data: ciudades } = await supabase
            .from('ciudades')
            .select('id')
            .eq('departamento_id', usuario.departamento_id);
        const ciudadIds = (ciudades || []).map((c) => c.id);
        let centroIds = [];
        if (ciudadIds.length > 0) {
            const { data: centros } = await supabase
                .from('centros_formacion')
                .select('id')
                .in('ciudad_id', ciudadIds);
            centroIds = (centros || []).map((c) => c.id);
        }
        return {
            ...vacio,
            departamentoIds: [usuario.departamento_id],
            ciudadIds,
            centroIds,
        };
    }

    return vacio;
};

export const aplicarScope = (query, scope) => {
    if (!scope || scope.tipo === 'global') return query;
    const ids = scope.centroIds && scope.centroIds.length > 0
        ? scope.centroIds
        : [UUID_IMPOSIBLE];
    return query.in('centro_id', ids);
};

export const puedeAccederCentro = async (usuario, centroId) => {
    const scope = await obtenerScope(usuario);
    if (scope.tipo === 'global') return true;
    return scope.centroIds.includes(centroId);
};

export const usuarioEnScope = (scope, objetivo) => {
    if (!scope || scope.tipo === 'global') return true;
    if (!objetivo) return false;
    if (objetivo.centro_id && scope.centroIds?.includes(objetivo.centro_id)) return true;
    if (objetivo.ciudad_id && scope.ciudadIds?.includes(objetivo.ciudad_id)) return true;
    if (objetivo.departamento_id && scope.departamentoIds?.includes(objetivo.departamento_id)) return true;
    if (objetivo.region_id && scope.regionIds?.includes(objetivo.region_id)) return true;
    return false;
};
