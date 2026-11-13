import { supabase } from "../config/supabase.js";
import { obtenerScope } from "./scope.service.js";

const obtenerMapaPreguntas = async () => {
    const { data, error } = await supabase
        .from("preguntas_aptitud")
        .select("id, pregunta, respuesta_apta")
        .eq("activo", true);
    if (error) throw error;
    return data.reduce((acc, p) => {
        acc[p.id] = { texto: p.pregunta, respuesta_apta: p.respuesta_apta };
        return acc;
    }, {});
};

const evaluarAptitud = async (respuestas) => {
    const mapa = await obtenerMapaPreguntas();
    const fallas = [];
    for (const r of respuestas) {
        const pregunta = mapa[r.pregunta_id];
        if (!pregunta) {
            fallas.push({
                pregunta_id: r.pregunta_id,
                pregunta: null,
                respuesta_dada: r.respuesta,
                respuesta_esperada: null,
                motivo: "pregunta_inexistente",
            });
        } else if (r.respuesta !== pregunta.respuesta_apta) {
            fallas.push({
                pregunta_id: r.pregunta_id,
                pregunta: pregunta.texto,
                respuesta_dada: r.respuesta,
                respuesta_esperada: pregunta.respuesta_apta,
                motivo: "respuesta_no_apta",
            });
        }
    }
    return { apto: fallas.length === 0, fallas, mapa };
};

export const registrarIntentoBloqueado = async ({
    conductorId,
    vehiculoId,
    centroId,
    razon,
    detalle,
}) => {
    const payload = {
        conductor_id: conductorId,
        vehiculo_id: vehiculoId || null,
        centro_id: centroId || null,
        razon,
        detalle: detalle || null,
    };

    const { error } = await supabase.from("intentos_chequeo_bloqueado").insert(payload);
    if (!error) return;

    const esFKVehiculo = error.message?.includes("vehiculo_id") || error.code === "23503";
    if (esFKVehiculo && payload.vehiculo_id !== null) {
        console.warn(
            `[intento bloqueado] vehiculo_id ${payload.vehiculo_id} no existe en BD, reintentando con null`
        );
        const { error: retry } = await supabase
            .from("intentos_chequeo_bloqueado")
            .insert({ ...payload, vehiculo_id: null });
        if (!retry) return;
        console.error("Error registrando intento bloqueado (retry):", retry.message);
        return;
    }

    console.error("Error registrando intento bloqueado:", error.message);
};

const verificarVehiculoParaChequeo = async (vehiculoId, centroDelConductor, esPool = false) => {
    const { data: vehiculo, error } = await supabase
        .from("vehiculos")
        .select("id, placa, activo, centro_id, estado, nivel_criticidad, es_vip, soat_vencimiento, rtm_vencimiento, extintor_vencimiento")
        .eq("id", vehiculoId)
        .maybeSingle();

    if (error || !vehiculo) {
        return { valido: false, razon: "vehiculo_no_existe", detalle: "Vehiculo no encontrado" };
    }
    if (vehiculo.centro_id !== centroDelConductor) {
        return { valido: false, razon: "vehiculo_no_existe", detalle: "El vehiculo no pertenece a tu centro" };
    }
    if (vehiculo.es_vip !== (esPool === true)) {
        return { valido: false, razon: "vehiculo_no_existe", detalle: "El vehiculo no esta disponible para ti" };
    }
    if (!vehiculo.activo) {
        return {
            valido: false,
            razon: "vehiculo_desactivado",
            vehiculo,
            detalle: `El vehiculo ${vehiculo.placa} esta deshabilitado por el administrador`,
        };
    }
    return { valido: true, vehiculo };
};

const primerDocumentoVencido = (vehiculo) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const docs = [
        ["SOAT", vehiculo.soat_vencimiento],
        ["revisión técnico-mecánica (RTM)", vehiculo.rtm_vencimiento],
        ["extintor", vehiculo.extintor_vencimiento],
    ];
    for (const [nombre, fecha] of docs) {
        if (!fecha) continue;
        const v = new Date(fecha);
        v.setHours(0, 0, 0, 0);
        if (v < hoy) {
            return {
                nombre,
                fechaLegible: v.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" }),
            };
        }
    }
    return null;
};

const esPrimerChequeoDelDia = async (vehiculoId, tipo) => {
    if (tipo !== "preoperacional") return false;

    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date();
    fin.setHours(23, 59, 59, 999);

    const { count, error } = await supabase
        .from("chequeos_preoperacionales")
        .select("id", { count: "exact", head: true })
        .eq("vehiculo_id", vehiculoId)
        .eq("tipo", "preoperacional")
        .gte("fecha", inicio.toISOString())
        .lte("fecha", fin.toISOString());

    if (error) {
        console.error("Error contando chequeos del dia:", error.message);
        return false;
    }
    return count === 0;
};

export const iniciarChequeo = async ({
    conductor,
    vehiculoId,
    tipo,
    kilometraje,
    respuestasAptitud,
}) => {
    if (conductor.licencia_vencimiento) {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const vencimiento = new Date(conductor.licencia_vencimiento);
        vencimiento.setHours(0, 0, 0, 0);

        if (vencimiento < hoy) {
            await registrarIntentoBloqueado({
                conductorId: conductor.id,
                vehiculoId: null,
                centroId: conductor.centro_id,
                razon: "licencia_vencida",
                detalle: `Licencia vencida el ${conductor.licencia_vencimiento}`,
            });
            const fechaLegible = vencimiento.toLocaleDateString("es-CO", {
                day: "2-digit",
                month: "long",
                year: "numeric",
            });
            return {
                exito: false,
                status: 403,
                error: `Tu licencia de conducción está vencida desde el ${fechaLegible}. Debes renovarla antes de operar un vehículo. Contacta al administrador del SENA.`,
                razon: "licencia_vencida",
            };
        }
    }

    const evaluacion = await evaluarAptitud(respuestasAptitud);
    if (!evaluacion.apto) {
        const idsFallidos = evaluacion.fallas.map((f) => f.pregunta_id);
        await registrarIntentoBloqueado({
            conductorId: conductor.id,
            vehiculoId,
            centroId: conductor.centro_id,
            razon: "conductor_no_apto",
            detalle: `Pregunta(s) no aptas: ${idsFallidos.join(", ")}`,
        });
        const cantidad = evaluacion.fallas.length;
        const mensaje = cantidad === 1
            ? "No estás en condiciones aptas para conducir. La pregunta que no fue apta se detalla en preguntas_fallidas."
            : `No estás en condiciones aptas para conducir. Las ${cantidad} preguntas que no fueron aptas se detallan en preguntas_fallidas.`;
        return {
            exito: false,
            status: 403,
            error: mensaje,
            razon: "conductor_no_apto",
            preguntas_fallidas: evaluacion.fallas,
        };
    }

    const verif = await verificarVehiculoParaChequeo(vehiculoId, conductor.centro_id, conductor.es_pool === true);
    if (!verif.valido) {
        await registrarIntentoBloqueado({
            conductorId: conductor.id,
            vehiculoId: verif.vehiculo?.id || null,
            centroId: conductor.centro_id,
            razon: verif.razon,
            detalle: verif.detalle,
        });
        return {
            exito: false,
            status: 403,
            error: verif.detalle,
            razon: verif.razon,
        };
    }

    if (tipo === "preoperacional") {
        const doc = primerDocumentoVencido(verif.vehiculo);
        if (doc) {
            return {
                exito: false,
                status: 403,
                error: `No puedes operar este vehículo: el ${doc.nombre} está vencido (desde el ${doc.fechaLegible}). Avísale al Coordinador de Flota para que lo renueve.`,
                razon: "documento_vencido",
            };
        }
    }

    const esOficial = await esPrimerChequeoDelDia(vehiculoId, tipo);

    const { data: chequeo, error: errChequeo } = await supabase
        .from("chequeos_preoperacionales")
        .insert({
            vehiculo_id: vehiculoId,
            conductor_id: conductor.id,
            centro_id: conductor.centro_id,
            tipo,
            es_oficial: esOficial,
            kilometraje,
        })
        .select()
        .single();

    if (errChequeo) {
        throw new Error(`Error creando chequeo: ${errChequeo.message}`);
    }

    const respuestasInsert = respuestasAptitud.map((r) => ({
        chequeo_id: chequeo.id,
        pregunta_id: r.pregunta_id,
        respuesta: r.respuesta,
        es_apto: r.respuesta === evaluacion.mapa[r.pregunta_id]?.respuesta_apta,
    }));

    const { error: errAptitud } = await supabase
        .from("respuestas_aptitud")
        .insert(respuestasInsert);

    if (errAptitud) {
        await supabase
            .from("chequeos_preoperacionales")
            .delete()
            .eq("id", chequeo.id);
        throw new Error(`Error guardando respuestas de aptitud: ${errAptitud.message}`);
    }

    return {
        exito: true,
        chequeo,
        vehiculo: verif.vehiculo,
    };
};

const obtenerChequeoEditable = async (chequeoId, conductorId) => {
    const { data: chequeo, error } = await supabase
        .from("chequeos_preoperacionales")
        .select("id, vehiculo_id, conductor_id, centro_id, tipo, cerrado")
        .eq("id", chequeoId)
        .maybeSingle();

    if (error || !chequeo) {
        return { error: { status: 404, mensaje: "Chequeo no encontrado" } };
    }
    if (chequeo.conductor_id !== conductorId) {
        return { error: { status: 403, mensaje: "Este chequeo no te pertenece" } };
    }
    if (chequeo.cerrado) {
        return { error: { status: 409, mensaje: "El chequeo ya esta cerrado, no se puede modificar" } };
    }
    return { chequeo };
};

export const guardarRespuestasChequeo = async ({ chequeoId, conductorId, respuestas }) => {
    const verificacion = await obtenerChequeoEditable(chequeoId, conductorId);
    if (verificacion.error) return verificacion;

    const filas = respuestas.map((r) => ({
        chequeo_id: chequeoId,
        item_id: r.item_id,
        estado: r.estado,
        observacion: r.observacion || null,
    }));

    const { data, error } = await supabase
        .from("respuestas_chequeo")
        .upsert(filas, { onConflict: "chequeo_id,item_id" })
        .select("id, item_id, estado, observacion");

    if (error) {
        return { error: { status: 500, mensaje: `Error guardando respuestas: ${error.message}` } };
    }

    const { count } = await supabase
        .from("respuestas_chequeo")
        .select("id", { count: "exact", head: true })
        .eq("chequeo_id", chequeoId);

    return {
        respuestas_guardadas: data,
        total_acumulado: count,
        total_esperado: 39,
    };
};

const NIVEL_ESTADO = {
    operativo: 1,
    observacion: 2,
    alerta: 3,
    critico: 4,
    no_operativo: 5,
};

const calcularResultado = (respuestas, itemsCriticosSet) => {
    let cumple = 0;
    let noCumple = 0;
    let noAplica = 0;
    let tieneFallaCritica = false;

    for (const r of respuestas) {
        if (r.estado === "cumple") cumple += 1;
        else if (r.estado === "no_cumple") {
            noCumple += 1;
            if (itemsCriticosSet.has(r.item_id)) tieneFallaCritica = true;
        } else if (r.estado === "no_aplica") noAplica += 1;
    }

    let estado;
    let criticidad;
    if (tieneFallaCritica) {
        estado = "no_operativo";
        criticidad = 95;
    } else if (noCumple === 0) {
        estado = "operativo";
        criticidad = 10;
    } else if (noCumple <= 3) {
        estado = "observacion";
        criticidad = 30;
    } else if (noCumple <= 7) {
        estado = "alerta";
        criticidad = 50;
    } else if (noCumple <= 15) {
        estado = "critico";
        criticidad = 75;
    } else {
        estado = "no_operativo";
        criticidad = 95;
    }

    return {
        items_cumple_count: cumple,
        items_no_cumple_count: noCumple,
        items_no_aplica_count: noAplica,
        tiene_falla_critica: tieneFallaCritica,
        resultado_estado: estado,
        resultado_criticidad: criticidad,
    };
};

export const cerrarChequeo = async ({ chequeoId, conductorId, notasGenerales }) => {
    const verificacion = await obtenerChequeoEditable(chequeoId, conductorId);
    if (verificacion.error) return verificacion;
    const { chequeo } = verificacion;

    const { data: respuestas, error: errRes } = await supabase
        .from("respuestas_chequeo")
        .select("item_id, estado")
        .eq("chequeo_id", chequeoId);

    if (errRes) {
        return { error: { status: 500, mensaje: `Error obteniendo respuestas: ${errRes.message}` } };
    }

    const { data: excepciones } = await supabase
        .from("excepciones_items_vehiculo")
        .select("item_id")
        .eq("vehiculo_id", chequeo.vehiculo_id);

    const itemsExcluidos = new Set((excepciones || []).map((e) => e.item_id));
    const totalEsperado = 39 - itemsExcluidos.size;

    if (respuestas.length < totalEsperado) {
        return {
            error: {
                status: 400,
                mensaje: `Faltan respuestas. Se esperaban ${totalEsperado} y solo se han registrado ${respuestas.length}`,
            },
        };
    }

    const { data: itemsCriticos } = await supabase
        .from("items_chequeo")
        .select("id")
        .eq("es_critico", true);

    const setCriticos = new Set((itemsCriticos || []).map((i) => i.id));

    const resultado = calcularResultado(respuestas, setCriticos);

    const itemsCriticosNoCumple = respuestas.filter(
        (r) => r.estado === "no_cumple" && setCriticos.has(r.item_id)
    ).length;

    const { data: chequeoCerrado, error: errCierre } = await supabase
        .from("chequeos_preoperacionales")
        .update({
            ...resultado,
            cerrado: true,
            fecha_cierre: new Date().toISOString(),
            notas_generales: notasGenerales || null,
        })
        .eq("id", chequeoId)
        .select()
        .single();

    if (errCierre) {
        return { error: { status: 500, mensaje: `Error cerrando chequeo: ${errCierre.message}` } };
    }

    const { data: vehiculo } = await supabase
        .from("vehiculos")
        .select("id, placa, estado, nivel_criticidad")
        .eq("id", chequeo.vehiculo_id)
        .single();

    const nivelActual = NIVEL_ESTADO[vehiculo.estado] || 1;
    const nivelNuevo = NIVEL_ESTADO[resultado.resultado_estado];

    let actualizacionVehiculo = null;
    let sugerenciaAdmin = null;

    if (nivelNuevo > nivelActual) {
        await supabase
            .from("vehiculos")
            .update({
                estado: resultado.resultado_estado,
                nivel_criticidad: resultado.resultado_criticidad,
            })
            .eq("id", vehiculo.id);

        actualizacionVehiculo = {
            estado_anterior: vehiculo.estado,
            estado_nuevo: resultado.resultado_estado,
            criticidad_anterior: vehiculo.nivel_criticidad,
            criticidad_nueva: resultado.resultado_criticidad,
        };
    } else if (nivelNuevo < nivelActual) {
        sugerenciaAdmin = {
            mensaje: `El chequeo del vehículo ${vehiculo.placa} sugiere mejorar el estado de ${vehiculo.estado} a ${resultado.resultado_estado}. Revisa y decide si aplicar el cambio.`,
            estado_actual: vehiculo.estado,
            estado_sugerido: resultado.resultado_estado,
            criticidad_actual: vehiculo.nivel_criticidad,
            criticidad_sugerida: resultado.resultado_criticidad,
        };
    }

    return {
        chequeo: chequeoCerrado,
        vehiculo: {
            id: vehiculo.id,
            placa: vehiculo.placa,
        },
        items_criticos_no_cumple: itemsCriticosNoCumple,
        actualizacion_vehiculo: actualizacionVehiculo,
        sugerencia_admin: sugerenciaAdmin,
    };
};

const obtenerCentrosVisiblesParaAdmin = async (usuario) => {
    const scope = await obtenerScope(usuario);
    return scope.tipo === "global" ? null : scope.centroIds;
};

export const listarChequeosParaAdmin = async ({
    usuario,
    fechaDesde,
    fechaHasta,
    placa,
    resultadoEstado,
    soloOficiales,
    soloCerrados,
    pagina = 1,
    limite = 20,
}) => {
    const centrosVisibles = await obtenerCentrosVisiblesParaAdmin(usuario);

    let query = supabase
        .from("chequeos_preoperacionales")
        .select(`
            id, fecha, tipo, es_oficial, kilometraje, cerrado, fecha_cierre,
            abandonado, abandonado_en, motivo_abandono,
            resultado_estado, resultado_criticidad,
            items_cumple_count, items_no_cumple_count, items_no_aplica_count,
            tiene_falla_critica,
            vehiculo:vehiculos (id, placa, marca, linea, tipo, modelo_anio),
            conductor:usuarios!chequeos_preoperacionales_conductor_id_fkey (id, nombre_completo, cedula, foto_url)
        `, { count: "exact" })
        .order("fecha", { ascending: false });

    if (centrosVisibles !== null) {
        if (centrosVisibles.length === 0) {
            return { chequeos: [], total: 0, pagina, limite };
        }
        query = query.in("centro_id", centrosVisibles);
    }

    if (fechaDesde) query = query.gte("fecha", fechaDesde);
    if (fechaHasta) query = query.lte("fecha", fechaHasta);
    if (resultadoEstado) query = query.eq("resultado_estado", resultadoEstado);
    if (soloOficiales === "true") query = query.eq("es_oficial", true);
    if (soloCerrados === "true") query = query.eq("cerrado", true);

    const desde = (pagina - 1) * limite;
    const hasta = desde + limite - 1;
    query = query.range(desde, hasta);

    const { data, error, count } = await query;
    if (error) throw error;

    let chequeos = data;
    const filtroPlaca = normalizarPlaca(placa);
    if (filtroPlaca) {
        chequeos = chequeos.filter((c) =>
            normalizarPlaca(c.vehiculo?.placa).includes(filtroPlaca)
        );
    }

    return { chequeos, total: count, pagina, limite };
};

export const obtenerChequeoCompleto = async (chequeoId, usuario) => {
    const centrosVisibles = await obtenerCentrosVisiblesParaAdmin(usuario);

    let query = supabase
        .from("chequeos_preoperacionales")
        .select(`
            *,
            vehiculo:vehiculos (
                id, placa, marca, linea, tipo, modelo_anio, color, vin,
                estado, nivel_criticidad, runt_url,
                fotos:fotos_vehiculo (id, url, es_principal)
            ),
            conductor:usuarios!chequeos_preoperacionales_conductor_id_fkey (
                id, nombre_completo, cedula, telefono, foto_url,
                licencia_numero, licencia_categoria, licencia_vencimiento
            )
        `)
        .eq("id", chequeoId);

    if (centrosVisibles !== null) {
        if (centrosVisibles.length === 0) {
            return { error: { status: 404, mensaje: "Chequeo no encontrado" } };
        }
        query = query.in("centro_id", centrosVisibles);
    }

    const { data: chequeo, error } = await query.maybeSingle();
    if (error || !chequeo) {
        return { error: { status: 404, mensaje: "Chequeo no encontrado" } };
    }

    const { data: respuestasAptitud } = await supabase
        .from("respuestas_aptitud")
        .select(`
            id, respuesta, es_apto,
            pregunta:preguntas_aptitud (id, pregunta, respuesta_apta, orden)
        `)
        .eq("chequeo_id", chequeoId);

    const { data: respuestasChequeo } = await supabase
        .from("respuestas_chequeo")
        .select(`
            id, estado, observacion,
            item:items_chequeo (
                id, descripcion, orden, es_critico,
                categoria:categorias_chequeo (id, nombre, icono, orden)
            ),
            fotos:fotos_chequeo (id, url, descripcion, fecha_subida, preservar_siempre, fecha_borrado_programado)
        `)
        .eq("chequeo_id", chequeoId);

    const respuestasOrdenadas = (respuestasChequeo || []).sort(
        (a, b) => (a.item?.orden || 0) - (b.item?.orden || 0)
    );
    const aptitudOrdenada = (respuestasAptitud || []).sort(
        (a, b) => (a.pregunta?.orden || 0) - (b.pregunta?.orden || 0)
    );

    return {
        chequeo: {
            ...chequeo,
            respuestas_aptitud: aptitudOrdenada,
            respuestas_chequeo: respuestasOrdenadas,
        },
    };
};

export const listarIntentosBloqueados = async ({
    usuario,
    fechaDesde,
    fechaHasta,
    razon,
    soloNoNotificados,
    pagina = 1,
    limite = 20,
}) => {
    const centrosVisibles = await obtenerCentrosVisiblesParaAdmin(usuario);

    let query = supabase
        .from("intentos_chequeo_bloqueado")
        .select(`
            id, razon, detalle, fecha, notificado_admin,
            conductor:usuarios!intentos_chequeo_bloqueado_conductor_id_fkey (id, nombre_completo, cedula),
            vehiculo:vehiculos (id, placa, marca, linea)
        `, { count: "exact" })
        .order("fecha", { ascending: false });

    if (centrosVisibles !== null) {
        if (centrosVisibles.length === 0) {
            return { intentos: [], total: 0, pagina, limite };
        }
        query = query.in("centro_id", centrosVisibles);
    }

    if (fechaDesde) query = query.gte("fecha", fechaDesde);
    if (fechaHasta) query = query.lte("fecha", fechaHasta);
    if (razon) query = query.eq("razon", razon);
    if (soloNoNotificados === "true") query = query.eq("notificado_admin", false);

    const desde = (pagina - 1) * limite;
    const hasta = desde + limite - 1;
    query = query.range(desde, hasta);

    const { data, error, count } = await query;
    if (error) throw error;

    return { intentos: data, total: count, pagina, limite };
};

export const registrarIntentoNoApto = async ({ conductor, respuestasAptitud }) => {
    const evaluacion = await evaluarAptitud(respuestasAptitud);

    if (evaluacion.apto) {
        return { apto: true, fallas: [] };
    }

    const idsFallidos = evaluacion.fallas.map((f) => f.pregunta_id);
    await registrarIntentoBloqueado({
        conductorId: conductor.id,
        vehiculoId: null,
        centroId: conductor.centro_id,
        razon: "conductor_no_apto",
        detalle: `Pregunta(s) no aptas: ${idsFallidos.join(", ")}`,
    });

    return { apto: false, fallas: evaluacion.fallas };
};

export const obtenerChequeosDelConductor = async (conductorId, limite = 10) => {
    const { data, error } = await supabase
        .from("chequeos_preoperacionales")
        .select(`
            id, fecha, tipo, es_oficial, cerrado, fecha_cierre,
            resultado_estado, resultado_criticidad, tiene_falla_critica,
            kilometraje,
            vehiculo:vehiculos (id, placa, marca, linea, tipo)
        `)
        .eq("conductor_id", conductorId)
        .order("fecha", { ascending: false })
        .limit(limite);

    if (error) throw error;
    return data;
};

export const obtenerVehiculosDisponibles = async (centroId, busqueda = "", esPool = false) => {
    if (!centroId) {
        throw new Error("El conductor no tiene centro asignado");
    }

    const { data, error } = await supabase
        .from("vehiculos")
        .select(`
            id, placa, marca, linea, tipo, modelo_anio, color,
            estado, nivel_criticidad, kilometraje_actual, es_vip,
            fotos:fotos_vehiculo (id, url, es_principal)
        `)
        .eq("centro_id", centroId)
        .eq("activo", true)
        .eq("es_vip", esPool === true)
        .order("placa", { ascending: true });

    if (error) throw error;

    const filtro = normalizarPlaca(busqueda);
    if (!filtro) return data;

    return data.filter((v) => normalizarPlaca(v.placa).includes(filtro));
};

const normalizarPlaca = (texto = "") => {
    return String(texto).toUpperCase().replace(/[^A-Z0-9]/g, "");
};

export const obtenerCatalogoCompleto = async () => {
    const [resCategorias, resItems, resPreguntas] = await Promise.all([
        supabase
            .from("categorias_chequeo")
            .select("id, nombre, descripcion, icono, orden")
            .eq("activo", true)
            .order("orden", { ascending: true }),
        supabase
            .from("items_chequeo")
            .select("id, categoria_id, descripcion, descripcion_larga, orden, es_critico, aplica_a_tipos")
            .eq("activo", true)
            .order("orden", { ascending: true }),
        supabase
            .from("preguntas_aptitud")
            .select("id, pregunta, respuesta_apta, orden")
            .eq("activo", true)
            .order("orden", { ascending: true }),
    ]);

    if (resCategorias.error) throw resCategorias.error;
    if (resItems.error) throw resItems.error;
    if (resPreguntas.error) throw resPreguntas.error;

    const itemsPorCategoria = resItems.data.reduce((acc, item) => {
        if (!acc[item.categoria_id]) acc[item.categoria_id] = [];
        acc[item.categoria_id].push({
            id: item.id,
            descripcion: item.descripcion,
            descripcion_larga: item.descripcion_larga,
            orden: item.orden,
            es_critico: item.es_critico,
            aplica_a_tipos: item.aplica_a_tipos,
        });
        return acc;
    }, {});

    const categorias = resCategorias.data.map((cat) => ({
        ...cat,
        items: itemsPorCategoria[cat.id] || [],
    }));

    return {
        categorias,
        preguntas_aptitud: resPreguntas.data,
        meta: {
            total_categorias: categorias.length,
            total_items: resItems.data.length,
            total_items_criticos: resItems.data.filter((i) => i.es_critico).length,
            total_preguntas: resPreguntas.data.length,
        },
    };
};
