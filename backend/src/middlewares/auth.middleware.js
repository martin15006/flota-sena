import { supabase } from "../config/supabase.js";

export const verificarToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token no proporcionado' });
        }

        const token = authHeader.slice(7);

        const { data, error } = await supabase.auth.getUser(token);

        if (error || !data?.user) {
            return res.status(401).json({ error: 'Token invalido o expirado' });
        }

        const { data: perfil, error: errPerfil } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (errPerfil || !perfil) {
            return res.status(401).json({ error: 'Perfil de usuarios no encontrado' });
        }

        if (!perfil.activo) {
            return res.status(403).json({ error: 'Cuenta desactivada' });
        }

        perfil.email = data.user.email;

        req.usuario = perfil;
        req.token = token;
        next();
    } catch (err) {
        console.error('Error verificando token:', err);
        res.status(500).json({ error: 'Error verificando token' });
    }
};

export const soloAdmin = (req, res, next) => {
    if (req.usuario?.rol !== 'admin') {
        return res
            .status(403)
            .json({ error: 'Solo administradores pueden hacer esta accion' });
    }
    next();
};