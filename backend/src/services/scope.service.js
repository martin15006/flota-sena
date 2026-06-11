// Servicio de SCOPE territorial (Fase 4 multinivel, Tarea #102).
//
// Dado un administrador, calcula QUE CENTROS puede ver segun su nivel y su
// territorio asignado. Casi todo en el sistema (vehiculos, chequeos, conductores,
// intentos) cuelga de un centro_id, asi que resolver "los centros de mi scope"
// permite filtrar cualquier consulta con un simple .in('centro_id', [...]).
//
// Jerarquia geografica: region -> departamento -> ciudad -> centro.
//
// Reglas por rol:
//   superadmin            -> TODOS los centros (sin filtro)
//   admin_regional        -> centros de su region (via departamentos -> ciudades)
//   admin_departamental   -> centros de su departamento (via ciudades)
//   admin_ciudad          -> centros de su ciudad
//   admin_centro / admin  -> solo su centro
//   (cualquier admin sin su scope asignado -> no ve nada, por seguridad)

import { supabase } from '../config/supabase.js';

// UUID imposible: se usa para forzar "0 resultados" cuando un admin no tiene
// scope valido, en vez de devolver todo por error.
const UUID_IMPOSIBLE = '00000000-0000-0000-0000-000000000000';

// Devuelve { tipo: 'global' }  -> sin filtro (superadmin)
//       o  { tipo: 'centros', centroIds, ciudadIds, departamentoIds, regionIds }
//          -> el scope territorial resuelto a TODOS sus niveles.
//
// centroIds es el que usa aplicarScope() para filtrar recursos (vehiculos,
// chequeos, etc. cuelgan de un centro). Los demas conjuntos (ciudadIds, etc.)
// sirven para ubicar a OTROS administradores que no tienen centro_id sino un
// territorio mas amplio (ver usuarioEnScope).
export const obtenerScope = async (usuario) => {
    const rol = usuario?.rol;

    // Superadmin ve todo el pais
    if (rol === 'superadmin') {
        return { tipo: 'global' };
    }

    // Scope vacio base: si un admin no tiene su territorio asignado, no ve nada.
    const vacio = {
        tipo: 'centros',
        regionIds: [],
        departamentoIds: [],
        ciudadIds: [],
        centroIds: [],
    };

    // Admin de centro (nuevo rol explicito) y conductor: solo su centro.
    if (rol === 'admin_centro' || rol === 'conductor') {
        return {
            ...vacio,
            centroIds: usuario.centro_id ? [usuario.centro_id] : [],
        };
    }

    // Alias historico 'admin' (antes del multinivel solo existian 'admin' y
    // 'conductor'). Para NO romper cuentas existentes:
    //   - si tiene centro asignado -> se comporta como admin_centro (su centro)
    //   - si NO tiene centro (admin "global" de antes) -> conserva visibilidad total
    if (rol === 'admin') {
        if (usuario.centro_id) {
            return { ...vacio, centroIds: [usuario.centro_id] };
        }
        return { tipo: 'global' };
    }

    // Admin de ciudad: los centros de su ciudad
    if (rol === 'admin_ciudad') {
        if (!usuario.ciudad_id) return vacio;
        const { data } = await supabase
            .from('centros_formacion')
            .select('id')
            .eq('ciudad_id', usuario.ciudad_id);
        return {
            ...vacio,
            ciudadIds: [usuario.ciudad_id],
            centroIds: (data || []).map((c) => c.id),
        };
    }

    // Admin departamental: ciudades del departamento -> centros de esas ciudades
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

    // Admin regional: departamentos de la region -> ciudades -> centros
    if (rol === 'admin_regional') {
        if (!usuario.region_id) return vacio;
        const { data: deptos } = await supabase
            .from('departamentos')
            .select('id')
            .eq('region_id', usuario.region_id);
        const deptoIds = (deptos || []).map((d) => d.id);
        let ciudadIds = [];
        let centroIds = [];
        if (deptoIds.length > 0) {
            const { data: ciudades } = await supabase
                .from('ciudades')
                .select('id')
                .in('departamento_id', deptoIds);
            ciudadIds = (ciudades || []).map((c) => c.id);
            if (ciudadIds.length > 0) {
                const { data: centros } = await supabase
                    .from('centros_formacion')
                    .select('id')
                    .in('ciudad_id', ciudadIds);
                centroIds = (centros || []).map((c) => c.id);
            }
        }
        return {
            ...vacio,
            regionIds: [usuario.region_id],
            departamentoIds: deptoIds,
            ciudadIds,
            centroIds,
        };
    }

    // Rol desconocido: por seguridad, no ve nada
    return vacio;
};

// Aplica el scope a una query de Supabase que tenga columna centro_id.
// Uso:
//   let query = supabase.from('vehiculos').select('*');
//   query = aplicarScope(query, scope);
export const aplicarScope = (query, scope) => {
    if (!scope || scope.tipo === 'global') return query;
    const ids = scope.centroIds && scope.centroIds.length > 0
        ? scope.centroIds
        : [UUID_IMPOSIBLE];
    return query.in('centro_id', ids);
};

// ¿El admin puede acceder a un recurso de un centro dado?
// Resuelve el scope y verifica si el centro esta dentro. Util para los chequeos
// de acceso individual (ver/editar/eliminar un vehiculo, etc.).
export const puedeAccederCentro = async (usuario, centroId) => {
    const scope = await obtenerScope(usuario);
    if (scope.tipo === 'global') return true;
    return scope.centroIds.includes(centroId);
};

// ¿El usuario OBJETIVO cae dentro del scope del admin?
// A diferencia de los vehiculos/chequeos (que siempre tienen centro_id), un
// usuario puede ser otro administrador cuyo territorio es mas amplio que un
// centro (una ciudad, un departamento, una region). Por eso comparamos cada
// nivel: el objetivo es visible si CUALQUIERA de sus asignaciones territoriales
// cae dentro del scope del admin que consulta.
//
// Ejemplos:
//   - admin_centro (scope: 1 centro) ve los conductores de su centro.
//   - admin_ciudad (scope: su ciudad + sus centros) ve conductores y
//     admin_centro de esos centros, y a si mismo (match por ciudad).
//   - superadmin ve a todos (scope global).
export const usuarioEnScope = (scope, objetivo) => {
    if (!scope || scope.tipo === 'global') return true;
    if (!objetivo) return false;
    if (objetivo.centro_id && scope.centroIds?.includes(objetivo.centro_id)) return true;
    if (objetivo.ciudad_id && scope.ciudadIds?.includes(objetivo.ciudad_id)) return true;
    if (objetivo.departamento_id && scope.departamentoIds?.includes(objetivo.departamento_id)) return true;
    if (objetivo.region_id && scope.regionIds?.includes(objetivo.region_id)) return true;
    return false;
};
