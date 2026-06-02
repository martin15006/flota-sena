import {
    obtenerCatalogoCompleto,
    obtenerVehiculosDisponibles,
    iniciarChequeo,
    guardarRespuestasChequeo,
    cerrarChequeo,
    listarChequeosParaAdmin,
    obtenerChequeoCompleto,
    listarIntentosBloqueados,
} from "../services/chequeos.service.js";

const ESTADOS_RESPUESTA_VALIDOS = ["cumple", "no_cumple", "no_aplica"];

// GET /api/chequeos/catalogo
// Devuelve categorias + items + preguntas de aptitud en una sola respuesta
export const getCatalogo = async (req, res) => {
    try {
        const catalogo = await obtenerCatalogoCompleto();
        res.json(catalogo);
    } catch (err) {
        console.error("Error obteniendo catalogo:", err);
        res.status(500).json({ error: "Error al obtener el catalogo del chequeo" });
    }
};

// GET /api/chequeos/vehiculos-disponibles?busqueda=OCJ
// Lista vehiculos activos del centro del conductor con busqueda opcional por placa
export const getVehiculosDisponibles = async (req, res) => {
    try {
        const { busqueda } = req.query;
        const vehiculos = await obtenerVehiculosDisponibles(
            req.usuario.centro_id,
            busqueda || ""
        );
        res.json({ vehiculos, total: vehiculos.length });
    } catch (err) {
        console.error("Error listando vehiculos disponibles:", err);
        res.status(500).json({ error: err.message || "Error al listar vehiculos" });
    }
};

// POST /api/chequeos/iniciar
// Body: { vehiculo_id, tipo, kilometraje, respuestas_aptitud: [{pregunta_id, respuesta}, ...] }
// Valida aptitud + vehiculo, crea cabecera del chequeo + guarda respuestas de aptitud
export const postIniciarChequeo = async (req, res) => {
    try {
        const { vehiculo_id, tipo, kilometraje, respuestas_aptitud } = req.body;

        if (!vehiculo_id) {
            return res.status(400).json({ error: "vehiculo_id es obligatorio" });
        }
        if (!tipo || !["preoperacional", "postoperacional"].includes(tipo)) {
            return res.status(400).json({ error: "tipo debe ser 'preoperacional' o 'postoperacional'" });
        }
        if (typeof kilometraje !== "number" || kilometraje < 0) {
            return res.status(400).json({ error: "kilometraje debe ser un numero positivo" });
        }
        if (!Array.isArray(respuestas_aptitud) || respuestas_aptitud.length !== 5) {
            return res.status(400).json({ error: "Se requieren las 5 respuestas de aptitud" });
        }
        for (const r of respuestas_aptitud) {
            if (!r.pregunta_id || !["si", "no"].includes(r.respuesta)) {
                return res.status(400).json({
                    error: "Cada respuesta debe tener pregunta_id y respuesta ('si' o 'no')",
                });
            }
        }

        const resultado = await iniciarChequeo({
            conductor: req.usuario,
            vehiculoId: vehiculo_id,
            tipo,
            kilometraje,
            respuestasAptitud: respuestas_aptitud,
        });

        if (!resultado.exito) {
            return res.status(resultado.status).json({
                error: resultado.error,
                razon: resultado.razon,
                preguntas_fallidas: resultado.preguntas_fallidas,
            });
        }

        res.status(201).json({
            mensaje: "Chequeo iniciado correctamente",
            chequeo: resultado.chequeo,
            vehiculo: {
                id: resultado.vehiculo.id,
                placa: resultado.vehiculo.placa,
                estado_actual: resultado.vehiculo.estado,
                nivel_criticidad: resultado.vehiculo.nivel_criticidad,
            },
        });
    } catch (err) {
        console.error("Error iniciando chequeo:", err);
        res.status(500).json({ error: err.message || "Error al iniciar el chequeo" });
    }
};

// PUT /api/chequeos/:id/respuestas
// Body: { respuestas: [{ item_id, estado, observacion }] }
// Permite envios parciales (1 a 39 respuestas), hace upsert por (chequeo_id, item_id)
export const putRespuestasChequeo = async (req, res) => {
    try {
        const { id } = req.params;
        const { respuestas } = req.body;

        if (!Array.isArray(respuestas) || respuestas.length === 0) {
            return res.status(400).json({ error: "Se requiere al menos una respuesta" });
        }

        for (const r of respuestas) {
            if (!r.item_id || typeof r.item_id !== "number") {
                return res.status(400).json({ error: "Cada respuesta debe tener item_id numerico" });
            }
            if (!ESTADOS_RESPUESTA_VALIDOS.includes(r.estado)) {
                return res.status(400).json({
                    error: `Estado invalido. Valores permitidos: ${ESTADOS_RESPUESTA_VALIDOS.join(", ")}`,
                });
            }
            if (r.estado === "no_cumple" && (!r.observacion || !r.observacion.trim())) {
                return res.status(400).json({
                    error: `El item ${r.item_id} fue marcado como NO CUMPLE pero no tiene observacion. La observacion es obligatoria cuando NO CUMPLE.`,
                });
            }
        }

        const resultado = await guardarRespuestasChequeo({
            chequeoId: id,
            conductorId: req.usuario.id,
            respuestas,
        });

        if (resultado.error) {
            return res.status(resultado.error.status).json({ error: resultado.error.mensaje });
        }

        res.json({
            mensaje: `${resultado.respuestas_guardadas.length} respuesta(s) guardada(s)`,
            respuestas_guardadas: resultado.respuestas_guardadas,
            total_acumulado: resultado.total_acumulado,
            total_esperado: resultado.total_esperado,
            completo: resultado.total_acumulado >= resultado.total_esperado,
        });
    } catch (err) {
        console.error("Error guardando respuestas:", err);
        res.status(500).json({ error: err.message || "Error al guardar respuestas" });
    }
};

// POST /api/chequeos/:id/cerrar
// Body opcional: { notas_generales }
// Calcula resultado, cierra el chequeo, actualiza estado del vehiculo si es peor,
// o devuelve sugerencia al admin si el resultado es mejor
export const postCerrarChequeo = async (req, res) => {
    try {
        const { id } = req.params;
        const { notas_generales } = req.body || {};

        const resultado = await cerrarChequeo({
            chequeoId: id,
            conductorId: req.usuario.id,
            notasGenerales: notas_generales,
        });

        if (resultado.error) {
            return res.status(resultado.error.status).json({ error: resultado.error.mensaje });
        }

        res.json({
            mensaje: "Chequeo cerrado correctamente",
            chequeo: resultado.chequeo,
            vehiculo: resultado.vehiculo,
            actualizacion_vehiculo: resultado.actualizacion_vehiculo,
            sugerencia_admin: resultado.sugerencia_admin,
        });
    } catch (err) {
        console.error("Error cerrando chequeo:", err);
        res.status(500).json({ error: err.message || "Error al cerrar el chequeo" });
    }
};

// GET /api/chequeos?fecha_desde=...&fecha_hasta=...&placa=...&resultado_estado=...&solo_oficiales=true&solo_cerrados=true&pagina=1&limite=20
// Lista chequeos visibles segun el scope del admin
export const getChequeos = async (req, res) => {
    try {
        const {
            fecha_desde,
            fecha_hasta,
            placa,
            resultado_estado,
            solo_oficiales,
            solo_cerrados,
            pagina,
            limite,
        } = req.query;

        const resultado = await listarChequeosParaAdmin({
            usuario: req.usuario,
            fechaDesde: fecha_desde,
            fechaHasta: fecha_hasta,
            placa,
            resultadoEstado: resultado_estado,
            soloOficiales: solo_oficiales,
            soloCerrados: solo_cerrados,
            pagina: pagina ? parseInt(pagina, 10) : 1,
            limite: limite ? parseInt(limite, 10) : 20,
        });

        res.json(resultado);
    } catch (err) {
        console.error("Error listando chequeos:", err);
        res.status(500).json({ error: err.message || "Error al listar chequeos" });
    }
};

// GET /api/chequeos/:id
// Devuelve el chequeo completo con cabecera + respuestas + aptitud + vehiculo + conductor + fotos
export const getChequeoPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const resultado = await obtenerChequeoCompleto(id, req.usuario);
        if (resultado.error) {
            return res.status(resultado.error.status).json({ error: resultado.error.mensaje });
        }
        res.json(resultado);
    } catch (err) {
        console.error("Error obteniendo chequeo:", err);
        res.status(500).json({ error: err.message || "Error al obtener el chequeo" });
    }
};

// GET /api/chequeos/intentos-bloqueados?fecha_desde=...&fecha_hasta=...&razon=...&solo_no_notificados=true&pagina=1&limite=20
// Lista intentos de chequeo bloqueados (no apto, vehiculo desactivado, etc.) visibles para el admin
export const getIntentosBloqueados = async (req, res) => {
    try {
        const {
            fecha_desde,
            fecha_hasta,
            razon,
            solo_no_notificados,
            pagina,
            limite,
        } = req.query;

        const resultado = await listarIntentosBloqueados({
            usuario: req.usuario,
            fechaDesde: fecha_desde,
            fechaHasta: fecha_hasta,
            razon,
            soloNoNotificados: solo_no_notificados,
            pagina: pagina ? parseInt(pagina, 10) : 1,
            limite: limite ? parseInt(limite, 10) : 20,
        });

        res.json(resultado);
    } catch (err) {
        console.error("Error listando intentos bloqueados:", err);
        res.status(500).json({ error: err.message || "Error al listar intentos bloqueados" });
    }
};
