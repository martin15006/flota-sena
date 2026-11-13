import { supabase } from "../config/supabase.js";
import { rolEfectivo } from "../services/jerarquia.service.js";
import { suplenciaVigenteDePool, centrosCubiertosDeSuplencia } from "../services/suplencias.service.js";

export const verificarToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        let token = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.slice(7);
        } else if (
            req.body &&
            typeof req.body.token === 'string' &&
            req.path.endsWith('/abandonar')
        ) {
            token = req.body.token;
            delete req.body.token;
        }

        const { data, error } = await supabase.auth.getUser(token);

        if (error || !data?.user) {
            return res.status(401).json({ error: 'Token invalido o expirado' });
        }

        const { data: perfil, error: errPerfil } = await supabase
            .from('usuarios')
            .select(`
                *,
                centros_formacion:centro_id (
                    id,
                    nombre
                )
            `)
            .eq('id', data.user.id)
            .single();

        if (errPerfil || !perfil) {
            return res.status(401).json({ error: 'Perfil de usuarios no encontrado' });
        }

        if (!perfil.activo) {
            return res.status(403).json({ error: 'Cuenta desactivada' });
        }

        perfil.email = data.user.email;
        perfil.centro_nombre = perfil.centros_formacion?.nombre || null;
        delete perfil.centros_formacion;

        perfil.suplencia = null;
        perfil.suplenciaCentros = [];
        perfil.centroActivo = null;
        if (perfil.rol === 'conductor' && perfil.es_pool === true && perfil.centro_id) {
            perfil.suplencia = await suplenciaVigenteDePool(perfil.id);
            if (perfil.suplencia) {
                perfil.suplenciaCentros = await centrosCubiertosDeSuplencia(perfil.suplencia);
                const ids = perfil.suplenciaCentros.map((c) => c.id);
                const headerCentro = req.headers['x-centro-activo'];
                if (headerCentro && ids.includes(headerCentro)) {
                    perfil.centroActivo = headerCentro;
                } else if (ids.length === 1) {
                    perfil.centroActivo = ids[0];
                }
            }
        }

        req.usuario = perfil;
        req.token = token;
        next();
    } catch (err) {
        console.error('Error verificando token:', err);
        res.status(500).json({ error: 'Error verificando token' });
    }
};

const ROLES_ADMIN = [
    'admin',
    'admin_centro',
    'admin_departamental',
    'superadmin',
];

export const requiereRol = (...rolesPermitidos) => (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(rolEfectivo(req.usuario))) {
        return res
            .status(403)
            .json({ error: 'No tienes permisos para realizar esta accion' });
    }
    next();
};

export const soloAdmin = (req, res, next) => {
    if (!req.usuario || !ROLES_ADMIN.includes(rolEfectivo(req.usuario))) {
        return res
            .status(403)
            .json({ error: 'Solo administradores pueden hacer esta accion' });
    }
    next();
};

export const soloConductor = (req, res, next) => {
    if (req.usuario?.rol !== 'conductor') {
        return res
            .status(403)
            .json({ error: 'Solo conductores pueden hacer esta accion' });
    }
    next();
};

export const adminOConductor = (req, res, next) => {
    const rol = rolEfectivo(req.usuario);
    if (!rol || (rol !== 'conductor' && !ROLES_ADMIN.includes(rol))) {
        return res
            .status(403)
            .json({ error: 'No tienes permisos para realizar esta accion' });
    }
    next();
};