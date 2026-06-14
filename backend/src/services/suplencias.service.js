import { supabase } from '../config/supabase.js';
import { obtenerScope, puedeAccederCentro } from './scope.service.js';

// "Vigente" = activa AND ahora dentro de [desde, hasta] (hasta NULL = abierta).
const SELECT_SUPLENCIA = `
    *,
    pool:pool_id ( id, nombre_completo, cedula ),
    centro:centro_id ( id, nombre ),
    departamento:departamento_id ( id, nombre ),
    activada_por:activada_por_id ( id, nombre_completo )
`;

// Resuelve los centros que CUBRE una suplencia (Fase B):
//   - alcance 'centro'       -> [centro_id]
//   - alcance 'departamento' -> todos los centros de ese depto (via ciudades)
// Devuelve [{ id, nombre }]. Si no resuelve nada, [].
export const centrosCubiertosDeSuplencia = async (suplencia) => {
    if (!suplencia) return [];
    if (suplencia.alcance === 'departamento' && suplencia.departamento_id) {
        const { data: ciudades } = await supabase
            .from('ciudades').select('id').eq('departamento_id', suplencia.departamento_id);
        const ciudadIds = (ciudades || []).map((c) => c.id);
        if (ciudadIds.length === 0) return [];
        const { data: centros } = await supabase
            .from('centros_formacion').select('id, nombre').in('ciudad_id', ciudadIds).eq('activo', true);
        return centros || [];
    }
    // alcance 'centro' (o legado sin alcance)
    if (suplencia.centro_id) {
        const { data: centro } = await supabase
            .from('centros_formacion').select('id, nombre').eq('id', suplencia.centro_id).maybeSingle();
        return centro ? [centro] : [];
    }
    return [];
};

// Calcula la vigencia EN JS, sobre filas ya filtradas por activa=true.
// Solo depende de `hasta`: `desde` siempre se setea en NOW() al activar (no hay
// forma de programar una suplencia a futuro), asi que comparar `desde` no aporta y
// ademas puede mis-disparar por como se parsea el timestamp (zona horaria). Vigente:
//   - hasta NULL  -> abierta, siempre vigente
//   - hasta fecha -> vigente si todavia no paso
const esVigente = (s, ahora = Date.now()) =>
    s.hasta == null || new Date(s.hasta).getTime() >= ahora;

// Suplencia VIGENTE de un pool (o null). Busca por pool_id (NO por su centro propio),
// porque la suplencia puede cubrir un centro distinto al del pool (Fase A: suplir otro
// centro de su area). Incluye el nombre del centro CUBIERTO para mostrarlo en la UI.
// La usa el middleware/login para adjuntar req.usuario.suplencia.
export const suplenciaVigenteDePool = async (poolId) => {
    if (!poolId) return null;
    const { data, error } = await supabase
        .from('suplencias')
        .select('*, centro:centro_id ( id, nombre ), departamento:departamento_id ( id, nombre )')
        .eq('pool_id', poolId)
        .eq('activa', true)
        .order('desde', { ascending: false });
    if (error) { console.error('suplenciaVigenteDePool:', error); return null; }
    return (data || []).find((s) => esVigente(s)) || null;
};

// Mapa poolId -> suplencia vigente, para una lista de pools (lo usa listarUsuarios
// para marcar quien esta supliendo ahora mismo).
export const mapaSuplenciasVigentes = async (poolIds = []) => {
    const mapa = new Map();
    if (!poolIds.length) return mapa;
    const { data, error } = await supabase
        .from('suplencias')
        .select('*')
        .in('pool_id', poolIds)
        .eq('activa', true);
    if (error) { console.error('mapaSuplenciasVigentes:', error); return mapa; }
    for (const s of data || []) {
        if (esVigente(s) && !mapa.has(s.pool_id)) mapa.set(s.pool_id, s);
    }
    return mapa;
};

// pool_ids con suplencia vigente que CUBRE un centro (para rutear notificaciones).
// Incluye las que lo cubren directo (alcance 'centro') y las que cubren todo su
// departamento (alcance 'departamento').
export const poolsVigentesEnCentro = async (centroId) => {
    if (!centroId) return [];
    // Directas (alcance 'centro')
    const { data: directas } = await supabase
        .from('suplencias').select('*').eq('centro_id', centroId).eq('activa', true);

    // Por departamento: resolver a que depto pertenece el centro (centro -> ciudad -> depto)
    const { data: centro } = await supabase
        .from('centros_formacion')
        .select('ciudad:ciudad_id ( departamento_id )')
        .eq('id', centroId)
        .maybeSingle();
    const deptoId = centro?.ciudad?.departamento_id;
    let porDepto = [];
    if (deptoId) {
        const { data } = await supabase
            .from('suplencias').select('*').eq('departamento_id', deptoId).eq('activa', true);
        porDepto = data || [];
    }

    const todas = [...(directas || []), ...porDepto];
    const ids = todas.filter((s) => esVigente(s)).map((s) => s.pool_id);
    return [...new Set(ids)];
};

// Activa una suplencia. Valida que el pool sea un conductor con es_pool y centro,
// que no tenga ya una vigente, y que el actor tenga scope sobre el centro del pool.
// Devuelve la suplencia creada o lanza un Error con .status.
export const activarSuplencia = async ({
    actor, poolId, alcance = 'centro', centroId = null, departamentoId = null,
    hasta = null, motivo = null,
}) => {
    const { data: pool, error: errPool } = await supabase
        .from('usuarios')
        .select('id, rol, es_pool, centro_id, activo')
        .eq('id', poolId)
        .maybeSingle();
    if (errPool) throw errPool;

    if (!pool || !pool.activo) {
        const e = new Error('Ese usuario no existe o esta desactivado.'); e.status = 404; throw e;
    }
    if (pool.rol !== 'conductor' || pool.es_pool !== true || !pool.centro_id) {
        const e = new Error('Solo un conductor del pool con centro asignado puede suplir.'); e.status = 400; throw e;
    }

    // Resolver el ALCANCE y validar que esté dentro del área del que activa.
    let centroCubierto = null;
    let deptoCubierto = null;
    if (alcance === 'departamento') {
        // Cubre TODOS los centros de una regional/departamento (Fase B). Solo lo puede
        // dar quien tenga ese depto en su scope (Director Regional de ese depto o Nacional).
        if (!departamentoId) {
            const e = new Error('Falta el departamento a cubrir.'); e.status = 400; throw e;
        }
        const scope = await obtenerScope(actor);
        const ok = scope.tipo === 'global' || (scope.departamentoIds || []).includes(departamentoId);
        if (!ok) {
            const e = new Error('Ese departamento no esta dentro de tu area.'); e.status = 403; throw e;
        }
        deptoCubierto = departamentoId;
    } else {
        // Un solo centro: el elegido o, por defecto, el propio del pool (Fase A).
        centroCubierto = centroId || pool.centro_id;
        const tieneScope = await puedeAccederCentro(actor, centroCubierto);
        if (!tieneScope) {
            const e = new Error('Ese centro no esta dentro de tu area.'); e.status = 403; throw e;
        }
    }

    const ahora = new Date().toISOString();
    if (hasta && new Date(hasta) <= new Date(ahora)) {
        const e = new Error('La fecha de fin debe ser posterior a ahora.'); e.status = 400; throw e;
    }

    // Ya hay una vigente para este pool? (una sola a la vez, sin importar el centro)
    const { data: activas } = await supabase
        .from('suplencias')
        .select('*')
        .eq('pool_id', poolId)
        .eq('activa', true);
    if ((activas || []).some((s) => esVigente(s))) {
        const e = new Error('Este conductor ya tiene una suplencia activa.'); e.status = 409; throw e;
    }

    const { data, error } = await supabase
        .from('suplencias')
        .insert({
            pool_id: poolId,
            alcance,
            centro_id: centroCubierto,
            departamento_id: deptoCubierto,
            activada_por_id: actor.id,
            motivo: (motivo || '').trim() || null,
            hasta: hasta || null,
        })
        .select(SELECT_SUPLENCIA)
        .single();
    if (error) throw error;
    return data;
};

// Desactiva una suplencia (manual). Valida scope sobre su centro o su departamento.
export const desactivarSuplencia = async ({ actor, suplenciaId }) => {
    const { data: sup, error: errSup } = await supabase
        .from('suplencias')
        .select('id, centro_id, departamento_id, activa')
        .eq('id', suplenciaId)
        .maybeSingle();
    if (errSup) throw errSup;
    if (!sup) { const e = new Error('Suplencia no encontrada.'); e.status = 404; throw e; }

    // El actor debe tener en su área el centro (si cubre uno) o el departamento (regional).
    const scope = await obtenerScope(actor);
    const enArea = scope.tipo === 'global'
        || (sup.centro_id && (scope.centroIds || []).includes(sup.centro_id))
        || (sup.departamento_id && (scope.departamentoIds || []).includes(sup.departamento_id));
    if (!enArea) { const e = new Error('Esa suplencia no es de tu area.'); e.status = 403; throw e; }

    const { data, error } = await supabase
        .from('suplencias')
        .update({ activa: false, desactivada_por_id: actor.id, desactivada_at: new Date().toISOString() })
        .eq('id', suplenciaId)
        .select(SELECT_SUPLENCIA)
        .single();
    if (error) throw error;
    return data;
};

// Lista suplencias dentro del scope del actor. Filtros opcionales: centroId, soloActivas.
// El filtro por scope se hace EN JS para cubrir tanto las de un centro como las de toda
// una regional (departamento), que el actor ve si el depto está en su área.
export const listarSuplencias = async ({ actor, centroId = null, soloActivas = false }) => {
    const scope = await obtenerScope(actor);
    let q = supabase.from('suplencias').select(SELECT_SUPLENCIA).order('desde', { ascending: false });
    if (soloActivas) q = q.eq('activa', true);
    if (centroId) q = q.eq('centro_id', centroId);
    const { data, error } = await q;
    if (error) throw error;
    let filas = data || [];
    if (scope.tipo !== 'global') {
        const centroSet = new Set(scope.centroIds || []);
        const deptoSet = new Set(scope.departamentoIds || []);
        filas = filas.filter((s) =>
            (s.centro_id && centroSet.has(s.centro_id)) ||
            (s.departamento_id && deptoSet.has(s.departamento_id))
        );
    }
    return filas;
};

// "Actividad del pool": acciones de auditoria hechas por un pool (accion_por_id),
// uniendo usuarios + vehiculos + chequeos, opcionalmente acotado a [desde, hasta].
export const actividadDelPool = async ({ actor, poolId, desde = null, hasta = null }) => {
    // El pool debe estar en el area del actor.
    const { data: pool } = await supabase
        .from('usuarios').select('id, centro_id').eq('id', poolId).maybeSingle();
    if (!pool) { const e = new Error('Conductor no encontrado.'); e.status = 404; throw e; }
    const tieneScope = await puedeAccederCentro(actor, pool.centro_id);
    if (!tieneScope) { const e = new Error('Ese conductor no es de tu area.'); e.status = 403; throw e; }

    const rango = (q) => {
        let r = q.eq('accion_por_id', poolId).order('created_at', { ascending: false });
        if (desde) r = r.gte('created_at', desde);
        if (hasta) r = r.lte('created_at', hasta);
        return r;
    };

    const [us, ve, ch] = await Promise.all([
        rango(supabase.from('auditoria_usuarios').select('id, accion, detalles, created_at, usuario_afectado_id')),
        rango(supabase.from('auditoria_vehiculos').select('id, accion, detalles, created_at, vehiculo_id')),
        rango(supabase.from('auditoria_chequeos').select('id, accion, detalles, created_at, chequeo_id')),
    ]);
    if (us.error) throw us.error;
    if (ve.error) throw ve.error;
    if (ch.error) throw ch.error;

    const items = [
        ...(us.data || []).map((x) => ({ ...x, tipo: 'usuario' })),
        ...(ve.data || []).map((x) => ({ ...x, tipo: 'vehiculo' })),
        ...(ch.data || []).map((x) => ({ ...x, tipo: 'chequeo' })),
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return items;
};
