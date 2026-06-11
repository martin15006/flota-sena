// Endpoints geograficos: regiones, departamentos, ciudades y centros de formacion.
//
// Multinivel (#102): cada listado se filtra por el SCOPE territorial del admin
// que consulta (scope.service.js). Asi, al crear un usuario, los selectores de
// territorio solo muestran lo que ese admin puede asignar:
//   - superadmin            -> todo el pais
//   - admin_regional        -> su region (sus departamentos / ciudades / centros)
//   - admin_departamental   -> su departamento (sus ciudades / centros)
//   - admin_ciudad          -> su ciudad (sus centros)
//   - admin_centro / admin  -> su centro
//
// Los filtros opcionales (?region_id=, ?departamento_id=, ?ciudad_id=) permiten
// que el frontend encadene los selectores (region -> depto -> ciudad -> centro).

import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { verificarToken, soloAdmin } from "../middlewares/auth.middleware.js";
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

// GET /api/geo/centros?ciudad_id=...
// Devuelve la lista de centros de formacion activos DENTRO del scope, con datos
// de ciudad y departamento para mostrar el contexto al admin en el dropdown.
router.get("/centros", async (req, res) => {
    try {
        const { ciudad_id } = req.query;
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
            .eq("activo", true)
            .order("nombre", { ascending: true });
        if (ciudad_id) q = q.eq("ciudad_id", ciudad_id);
        q = filtrarPorScope(q, scope, scope.centroIds || []);

        const { data, error } = await q;
        if (error) throw error;

        // Aplanar la respuesta para que sea mas comoda en el frontend
        const centros = (data || []).map((c) => ({
            id: c.id,
            nombre: c.nombre,
            direccion: c.direccion,
            ciudad: c.ciudad?.nombre || null,
            departamento: c.ciudad?.departamento?.nombre || null,
        }));

        res.json({ centros, total: centros.length });
    } catch (err) {
        console.error("Error listando centros:", err);
        res.status(500).json({ error: err.message || "Error al listar centros" });
    }
});

export default router;
