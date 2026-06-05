// Controlador del dashboard administrativo.
// Devuelve KPIs del dia + alertas que necesitan atencion del admin.
//
// Diferenciacion por rol (multinivel ya pensada para Tarea #102):
//   - admin / admin_centro       -> solo datos de SU centro (centro_id del JWT)
//   - admin_ciudad y superiores  -> ven todo por ahora (Tarea #102 implementara
//                                   el filtro por su scope: ciudad, departamento,
//                                   region, o pais completo).
//
// IMPORTANTE: para "del dia" usamos la medianoche local del servidor. En produccion,
// si el servidor estuviera en otra zona horaria distinta a Colombia, habria que
// normalizar a America/Bogota explicitamente.

import { supabase } from '../config/supabase.js';

// Roles que SOLO ven datos de su propio centro
const ROLES_LIMITADOS_A_CENTRO = ['admin', 'admin_centro'];

// Helper: devuelve el ISO string de la medianoche de hoy en hora local
const inicioDelDiaISO = () => {
    const ahora = new Date();
    const inicio = new Date(
        ahora.getFullYear(),
        ahora.getMonth(),
        ahora.getDate(),
        0, 0, 0, 0
    );
    return inicio.toISOString();
};

// Helper: ISO de hoy + N dias hacia el futuro
const enDiasISO = (dias) => {
    const ahora = new Date();
    const objetivo = new Date(
        ahora.getFullYear(),
        ahora.getMonth(),
        ahora.getDate() + dias,
        23, 59, 59, 999
    );
    return objetivo.toISOString();
};

// Helper: si el rol del admin lo restringe a su centro, aplica el filtro
// y devuelve la query modificada. Si no, devuelve la query original.
const filtrarPorCentroSiAplica = (query, usuario) => {
    if (ROLES_LIMITADOS_A_CENTRO.includes(usuario.rol)) {
        if (!usuario.centro_id) {
            // El admin no tiene centro asignado: devolvera vacio en todo.
            // Forzamos un filtro imposible para evitar leak.
            return query.eq('centro_id', '00000000-0000-0000-0000-000000000000');
        }
        return query.eq('centro_id', usuario.centro_id);
    }
    return query;
};

export const obtenerStatsDashboard = async (req, res) => {
    try {
        const usuario = req.usuario; // viene del middleware verificarToken
        const desdeHoy = inicioDelDiaISO();
        const enUnMes = enDiasISO(30);

        // ====================================================================
        // 1) KPIs del dia (4 cajas)
        // ====================================================================

        // a) Chequeos creados hoy (cerrados o no)
        const chequeosHoyQuery = supabase
            .from('chequeos_preoperacionales')
            .select('id', { count: 'exact', head: true })
            .gte('fecha', desdeHoy);

        // b) Chequeos cerrados hoy con resultado NO OPERATIVO
        const noOperativosHoyQuery = supabase
            .from('chequeos_preoperacionales')
            .select('id', { count: 'exact', head: true })
            .gte('fecha', desdeHoy)
            .eq('cerrado', true)
            .eq('resultado_estado', 'no_operativo');

        // c) Intentos bloqueados de hoy
        const intentosHoyQuery = supabase
            .from('intentos_chequeo_bloqueado')
            .select('id', { count: 'exact', head: true })
            .gte('fecha', desdeHoy);

        // d) Conductores activos (totalidad, no del dia)
        const conductoresActivosQuery = supabase
            .from('usuarios')
            .select('id', { count: 'exact', head: true })
            .eq('rol', 'conductor')
            .eq('activo', true);

        // Aplicar filtro de centro si aplica y ejecutar todo en paralelo
        const [
            { count: chequeosDelDia },
            { count: chequeosNoOperativosDelDia },
            { count: intentosBloqueadosDelDia },
            { count: conductoresActivos },
        ] = await Promise.all([
            filtrarPorCentroSiAplica(chequeosHoyQuery, usuario),
            filtrarPorCentroSiAplica(noOperativosHoyQuery, usuario),
            filtrarPorCentroSiAplica(intentosHoyQuery, usuario),
            filtrarPorCentroSiAplica(conductoresActivosQuery, usuario),
        ]);

        // ====================================================================
        // 2) Alertas "Necesita atencion"
        // ====================================================================

        // a) Licencias por vencer (proximos 30 dias) — solo conductores activos
        let licenciasQuery = supabase
            .from('usuarios')
            .select('id, nombre_completo, licencia_numero, licencia_categoria, licencia_vencimiento, centro_id')
            .eq('rol', 'conductor')
            .eq('activo', true)
            .not('licencia_vencimiento', 'is', null)
            .lte('licencia_vencimiento', enUnMes.split('T')[0])
            .order('licencia_vencimiento', { ascending: true });
        licenciasQuery = filtrarPorCentroSiAplica(licenciasQuery, usuario);
        const { data: licenciasPorVencerRaw } = await licenciasQuery;

        // Calcular dias_restantes para cada licencia (negativo si ya vencio)
        const hoyMidnight = new Date(desdeHoy);
        const licenciasPorVencer = (licenciasPorVencerRaw || []).map((u) => {
            const vencimiento = new Date(u.licencia_vencimiento);
            const diffMs = vencimiento - hoyMidnight;
            const diasRestantes = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            return {
                id: u.id,
                nombre_completo: u.nombre_completo,
                licencia_numero: u.licencia_numero,
                licencia_categoria: u.licencia_categoria,
                licencia_vencimiento: u.licencia_vencimiento,
                dias_restantes: diasRestantes,
            };
        });

        // b) Vehiculos sin RUNT cargado
        let sinRuntQuery = supabase
            .from('vehiculos')
            .select('id, placa, marca, linea')
            .is('runt_url', null)
            .eq('activo', true);
        sinRuntQuery = filtrarPorCentroSiAplica(sinRuntQuery, usuario);
        const { data: vehiculosSinRunt } = await sinRuntQuery;

        // c) Vehiculos no operativos (estado='no_operativo' o inactivos)
        let noOperativosQuery = supabase
            .from('vehiculos')
            .select('id, placa, marca, linea, estado, activo')
            .or('estado.eq.no_operativo,activo.eq.false');
        noOperativosQuery = filtrarPorCentroSiAplica(noOperativosQuery, usuario);
        const { data: vehiculosNoOperativos } = await noOperativosQuery;

        // ====================================================================
        // 3) Respuesta
        // ====================================================================

        res.json({
            scope: ROLES_LIMITADOS_A_CENTRO.includes(usuario.rol)
                ? { tipo: 'centro', centro_id: usuario.centro_id }
                : { tipo: 'global' },
            generado_en: new Date().toISOString(),
            kpis: {
                chequeos_del_dia: chequeosDelDia || 0,
                chequeos_no_operativos_del_dia: chequeosNoOperativosDelDia || 0,
                intentos_bloqueados_del_dia: intentosBloqueadosDelDia || 0,
                conductores_activos: conductoresActivos || 0,
            },
            alertas: {
                licencias_por_vencer: licenciasPorVencer,
                vehiculos_sin_runt: vehiculosSinRunt || [],
                vehiculos_no_operativos: vehiculosNoOperativos || [],
            },
        });
    } catch (err) {
        console.error('Error en obtenerStatsDashboard:', err);
        res.status(500).json({ error: 'Error al obtener las estadisticas del dashboard' });
    }
};
