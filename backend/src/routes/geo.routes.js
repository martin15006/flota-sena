// Endpoints geograficos: regiones, departamentos, ciudades y centros de formacion del SENA.
// Por ahora solo el listado de centros activos para usar en los formularios del admin.

import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { verificarToken, soloAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verificarToken);
router.use(soloAdmin);

// GET /api/geo/centros
// Devuelve la lista de centros de formacion activos, con datos de ciudad y departamento
// para mostrar el contexto al admin en el dropdown.
router.get("/centros", async (req, res) => {
    try {
        const { data, error } = await supabase
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
