import { supabase } from '../config/supabase.js';
import { obtenerScope, aplicarScope } from '../services/scope.service.js';

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

export const obtenerStatsDashboard = async (req, res) => {
    try {
        const usuario = req.usuario;
        const scope = await obtenerScope(usuario);
        const desdeHoy = inicioDelDiaISO();
        const enUnMes = enDiasISO(30);

        const chequeosHoyQuery = supabase
            .from('chequeos_preoperacionales')
            .select('id', { count: 'exact', head: true })
            .gte('fecha', desdeHoy);

        const noOperativosHoyQuery = supabase
            .from('chequeos_preoperacionales')
            .select('id', { count: 'exact', head: true })
            .gte('fecha', desdeHoy)
            .eq('cerrado', true)
            .eq('resultado_estado', 'no_operativo');

        const intentosHoyQuery = supabase
            .from('intentos_chequeo_bloqueado')
            .select('id', { count: 'exact', head: true })
            .gte('fecha', desdeHoy);

        const conductoresActivosQuery = supabase
            .from('usuarios')
            .select('id', { count: 'exact', head: true })
            .eq('rol', 'conductor')
            .eq('activo', true);

        const abandonadosHoyQuery = supabase
            .from('chequeos_preoperacionales')
            .select('id', { count: 'exact', head: true })
            .gte('abandonado_en', desdeHoy)
            .eq('abandonado', true);

        const [
            { count: chequeosDelDia },
            { count: chequeosNoOperativosDelDia },
            { count: intentosBloqueadosDelDia },
            { count: conductoresActivos },
            { count: chequeosAbandonadosDelDia },
        ] = await Promise.all([
            aplicarScope(chequeosHoyQuery, scope),
            aplicarScope(noOperativosHoyQuery, scope),
            aplicarScope(intentosHoyQuery, scope),
            aplicarScope(conductoresActivosQuery, scope),
            aplicarScope(abandonadosHoyQuery, scope),
        ]);

        let licenciasQuery = supabase
            .from('usuarios')
            .select('id, nombre_completo, licencia_numero, licencia_categoria, licencia_vencimiento, centro_id')
            .eq('rol', 'conductor')
            .eq('activo', true)
            .not('licencia_vencimiento', 'is', null)
            .lte('licencia_vencimiento', enUnMes.split('T')[0])
            .order('licencia_vencimiento', { ascending: true });
        licenciasQuery = aplicarScope(licenciasQuery, scope);
        const { data: licenciasPorVencerRaw } = await licenciasQuery;

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

        let sinRuntQuery = supabase
            .from('vehiculos')
            .select('id, placa, marca, linea')
            .is('runt_url', null)
            .eq('activo', true);
        sinRuntQuery = aplicarScope(sinRuntQuery, scope);
        const { data: vehiculosSinRunt } = await sinRuntQuery;

        let noOperativosQuery = supabase
            .from('vehiculos')
            .select('id, placa, marca, linea, estado, activo')
            .or('estado.eq.no_operativo,activo.eq.false');
        noOperativosQuery = aplicarScope(noOperativosQuery, scope);
        const { data: vehiculosNoOperativos } = await noOperativosQuery;

        let abandonadosListaQuery = supabase
            .from('chequeos_preoperacionales')
            .select(`
                id,
                abandonado_en,
                motivo_abandono,
                tipo,
                conductor:conductor_id ( id, nombre_completo ),
                vehiculo:vehiculo_id ( id, placa )
            `)
            .eq('abandonado', true)
            .gte('abandonado_en', desdeHoy)
            .order('abandonado_en', { ascending: false })
            .limit(10);
        abandonadosListaQuery = aplicarScope(abandonadosListaQuery, scope);
        const { data: abandonadosRaw } = await abandonadosListaQuery;
        const chequeosAbandonados = (abandonadosRaw || []).map((c) => ({
            id: c.id,
            abandonado_en: c.abandonado_en,
            motivo_abandono: c.motivo_abandono,
            tipo: c.tipo,
            conductor_nombre: c.conductor?.nombre_completo || '—',
            placa: c.vehiculo?.placa || '—',
        }));

        res.json({
            scope: scope.tipo === 'global'
                ? { tipo: 'global' }
                : { tipo: 'centros', cantidad_centros: scope.centroIds.length },
            generado_en: new Date().toISOString(),
            kpis: {
                chequeos_del_dia: chequeosDelDia || 0,
                chequeos_no_operativos_del_dia: chequeosNoOperativosDelDia || 0,
                intentos_bloqueados_del_dia: intentosBloqueadosDelDia || 0,
                conductores_activos: conductoresActivos || 0,
                chequeos_abandonados_del_dia: chequeosAbandonadosDelDia || 0,
            },
            alertas: {
                licencias_por_vencer: licenciasPorVencer,
                vehiculos_sin_runt: vehiculosSinRunt || [],
                vehiculos_no_operativos: vehiculosNoOperativos || [],
                chequeos_abandonados: chequeosAbandonados,
            },
        });
    } catch (err) {
        console.error('Error en obtenerStatsDashboard:', err);
        res.status(500).json({ error: 'Error al obtener las estadisticas del dashboard' });
    }
};
