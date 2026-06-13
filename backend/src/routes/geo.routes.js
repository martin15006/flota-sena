// Endpoints geograficos: regiones, departamentos, ciudades y centros de formacion.
//
// Multinivel (#102): cada listado se filtra por el SCOPE territorial del admin
// que consulta (scope.service.js). Asi, al crear un usuario, los selectores de
// territorio solo muestran lo que ese admin puede asignar:
//   - superadmin            -> todo el pais
//   - admin_departamental   -> su departamento (sus ciudades / centros)
//   - admin_centro / admin  -> su centro
//
// Los filtros opcionales (?region_id=, ?departamento_id=, ?ciudad_id=) permiten
// que el frontend encadene los selectores (region -> depto -> ciudad -> centro).

import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { verificarToken, soloAdmin, requiereRol } from "../middlewares/auth.middleware.js";
import { obtenerScope } from "../services/scope.service.js";

const router = Router();

router.use(verificarToken);
router.use(soloAdmin);

// UUID imposible: fuerza "0 resultados" cuando un admin no tiene scope en ese nivel.
const UUID_IMPOSIBLE = "00000000-0000-0000-0000-000000000000";

// Aplica .in('id', ids) salvo que el scope sea global (superadmin ve todo).
const filtrarPorScope = (query, scope, ids) => {
    if (scope.tipo === "global") return query;
    return query.in("id", ids.length > 0 ? ids : [UUID_IMPOSIBLE]);
};

// GET /api/geo/regiones
// Regiones dentro del scope (en la practica, solo el superadmin las necesita,
// porque solo el crea admins regionales).
router.get("/regiones", async (req, res) => {
    try {
        const scope = await obtenerScope(req.usuario);
        let q = supabase.from("regiones").select("id, nombre").order("nombre", { ascending: true });
        q = filtrarPorScope(q, scope, scope.regionIds || []);
        const { data, error } = await q;
        if (error) throw error;
        res.json({ regiones: data || [] });
    } catch (err) {
        console.error("Error listando regiones:", err);
        res.status(500).json({ error: err.message || "Error al listar regiones" });
    }
});

// GET /api/geo/departamentos?region_id=...
router.get("/departamentos", async (req, res) => {
    try {
        const { region_id } = req.query;
        const scope = await obtenerScope(req.usuario);
        let q = supabase
            .from("departamentos")
            .select("id, nombre, region_id")
            .order("nombre", { ascending: true });
        if (region_id) q = q.eq("region_id", region_id);
        q = filtrarPorScope(q, scope, scope.departamentoIds || []);
        const { data, error } = await q;
        if (error) throw error;
        res.json({ departamentos: data || [] });
    } catch (err) {
        console.error("Error listando departamentos:", err);
        res.status(500).json({ error: err.message || "Error al listar departamentos" });
    }
});

// GET /api/geo/ciudades?departamento_id=...
router.get("/ciudades", async (req, res) => {
    try {
        const { departamento_id } = req.query;
        const scope = await obtenerScope(req.usuario);
        let q = supabase
            .from("ciudades")
            .select("id, nombre, departamento_id")
            .order("nombre", { ascending: true });
        if (departamento_id) q = q.eq("departamento_id", departamento_id);
        q = filtrarPorScope(q, scope, scope.ciudadIds || []);
        const { data, error } = await q;
        if (error) throw error;
        res.json({ ciudades: data || [] });
    } catch (err) {
        console.error("Error listando ciudades:", err);
        res.status(500).json({ error: err.message || "Error al listar ciudades" });
    }
});

// GET /api/geo/centros?ciudad_id=...&incluir_inactivos=true
// Devuelve la lista de centros de formacion activos DENTRO del scope, con datos
// de ciudad y departamento para mostrar el contexto al admin en el dropdown.
// `incluir_inactivos=true` lo usa la pantalla de gestion de geografia (para
// poder reactivar centros); los selectores normales solo ven activos.
router.get("/centros", async (req, res) => {
    try {
        const { ciudad_id, incluir_inactivos } = req.query;
        const scope = await obtenerScope(req.usuario);
        let q = supabase
            .from("centros_formacion")
            .select(`
                id, nombre, direccion, activo,
                ciudad:ciudades (
                    id, nombre,
                    departamento:departamentos (id, nombre)
                )
            `)
            .order("nombre", { ascending: true });
        if (incluir_inactivos !== "true") q = q.eq("activo", true);
        if (ciudad_id) q = q.eq("ciudad_id", ciudad_id);
        q = filtrarPorScope(q, scope, scope.centroIds || []);

        const { data, error } = await q;
        if (error) throw error;

        // Aplanar la respuesta para que sea mas comoda en el frontend
        const centros = (data || []).map((c) => ({
            id: c.id,
            nombre: c.nombre,
            direccion: c.direccion,
            activo: c.activo,
            ciudad_id: c.ciudad?.id || null,
            ciudad: c.ciudad?.nombre || null,
            departamento: c.ciudad?.departamento?.nombre || null,
        }));

        res.json({ centros, total: centros.length });
    } catch (err) {
        console.error("Error listando centros:", err);
        res.status(500).json({ error: err.message || "Error al listar centros" });
    }
});

// ============================================================================
// ESCRITURA (gestion de geografia, #116) — SOLO SUPERADMIN
// ============================================================================
// Regiones y departamentos son la division fija de Colombia: NO se editan.
// Lo administrable es: agregar ciudades/municipios y crear/editar/activar
// centros de formacion. No hay DELETE: los centros se desactivan (preserva
// historial de vehiculos/chequeos); las ciudades solo se crean.

// POST /api/geo/ciudades  { nombre, departamento_id }
router.post("/ciudades", requiereRol("superadmin"), async (req, res) => {
    try {
        const { nombre, departamento_id } = req.body;
        const nombreLimpio = (nombre || "").trim();
        if (!nombreLimpio || !departamento_id) {
            return res.status(400).json({ error: "El nombre y el departamento son obligatorios" });
        }

        const { data, error } = await supabase
            .from("ciudades")
            .insert({ nombre: nombreLimpio, departamento_id })
            .select("id, nombre, departamento_id")
            .single();

        if (error) {
            // 23505 = violacion de UNIQUE(nombre, departamento_id)
            if (error.code === "23505") {
                return res.status(400).json({ error: "Esa ciudad ya existe en ese departamento" });
            }
            // 23503 = FK invalida (departamento inexistente)
            if (error.code === "23503") {
                return res.status(400).json({ error: "El departamento seleccionado no existe" });
            }
            throw error;
        }

        res.status(201).json({ ciudad: data });
    } catch (err) {
        console.error("Error creando ciudad:", err);
        res.status(500).json({ error: err.message || "Error al crear la ciudad" });
    }
});

// POST /api/geo/centros  { nombre, ciudad_id, direccion? }
router.post("/centros", requiereRol("superadmin"), async (req, res) => {
    try {
        const { nombre, ciudad_id, direccion } = req.body;
        const nombreLimpio = (nombre || "").trim();
        if (!nombreLimpio || !ciudad_id) {
            return res.status(400).json({ error: "El nombre y la ciudad son obligatorios" });
        }

        // La tabla no tiene UNIQUE(nombre, ciudad_id): verificar duplicado a mano
        const { data: existente } = await supabase
            .from("centros_formacion")
            .select("id")
            .eq("ciudad_id", ciudad_id)
            .ilike("nombre", nombreLimpio)
            .maybeSingle();
        if (existente) {
            return res.status(400).json({ error: "Ya existe un centro con ese nombre en esa ciudad" });
        }

        const { data, error } = await supabase
            .from("centros_formacion")
            .insert({ nombre: nombreLimpio, ciudad_id, direccion: (direccion || "").trim() || null })
            .select("id, nombre, ciudad_id, direccion, activo")
            .single();

        if (error) {
            if (error.code === "23503") {
                return res.status(400).json({ error: "La ciudad seleccionada no existe" });
            }
            throw error;
        }

        res.status(201).json({ centro: data });
    } catch (err) {
        console.error("Error creando centro:", err);
        res.status(500).json({ error: err.message || "Error al crear el centro" });
    }
});

// PATCH /api/geo/centros/:id  { nombre?, direccion?, activo? }
router.patch("/centros/:id", requiereRol("superadmin"), async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, direccion, activo } = req.body;

        const cambios = {};
        if (nombre !== undefined) {
            const nombreLimpio = (nombre || "").trim();
            if (!nombreLimpio) {
                return res.status(400).json({ error: "El nombre no puede quedar vacio" });
            }
            cambios.nombre = nombreLimpio;
        }
        if (direccion !== undefined) cambios.direccion = (direccion || "").trim() || null;
        if (activo !== undefined) cambios.activo = activo === true;

        if (Object.keys(cambios).length === 0) {
            return res.status(400).json({ error: "No hay cambios para aplicar" });
        }

        const { data, error } = await supabase
            .from("centros_formacion")
            .update(cambios)
            .eq("id", id)
            .select("id, nombre, ciudad_id, direccion, activo")
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: "Centro no encontrado" });

        res.json({ centro: data });
    } catch (err) {
        console.error("Error actualizando centro:", err);
        res.status(500).json({ error: err.message || "Error al actualizar el centro" });
    }
});

export default router;
