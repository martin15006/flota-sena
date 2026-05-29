import { supabase } from "../config/supabase.js";
import { resolverIdentificador, obtenerPerfil } from "../services/auth.service.js";


export const login = async (req, res) => {
    try {
        const { identificador, password } = req.body;

        if (!identificador || !password) {
            return res.status(400).json({
                error: 'Identificador y contraseñas son obligatorios',
            });
        }

        const email = await resolverIdentificador(identificador);
        if (!email) {
            return res.status(401).json({ error: 'Credenciales invalidas' });
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return res.status(401).json({ error: 'Credenciales invalidas' });
        }

        const perfil = await obtenerPerfil(data.user.id);

        if (!perfil.activo) {
            return res.status(403).json({ error: 'Cuenta desactivada' });
        }

        res.json({
            token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expira_en: data.session.expires_in,
            usuario: {
                id: perfil.id,
                cedula: perfil.cedula,
                nombre_completo: perfil.nombre_completo,
                rol: perfil.rol,
                debe_cambiar_password: perfil.debe_cambiar_password,
                foto_url: perfil.foto_url,
            },
        });
    } catch (err) {
        console.error('Error en login: ', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const obtenerActual = (req, res) => {
    res.json({
        usuario: {
            id: req.usuario.id,
            cedula: req.usuario.cedula,
            nombre_completo: req.usuario.nombre_completo,
            telefono: req.usuario.telefono,
            email: req.usuario.email,
            rol: req.usuario.rol,
            foto_url: req.usuario.foto_url,
            debe_cambiar_password: req.usuario.debe_cambiar_password,
            licencia_numero: req.usuario.licencia_numero,
            licencia_categoria: req.usuario.licencia_categoria,
            licencia_vencimiento: req.usuario.licencia_vencimiento,
        },
    });
};

export const cambiarPassword = async (req, res) => {
    try {
        const { password_actual, password_nueva, password_confirmacion } = req.body;

        // Validaciones basicas
        if (!password_actual || !password_nueva || !password_confirmacion) {
            return res.status(400).json({
                error: "Todos los campos son obligatorios",
            });
        }

        if (password_nueva !== password_confirmacion) {
            return res.status(400).json({
                error: "Las contraseñas nuevas no coinciden",
            });
        }

        if (password_nueva.length < 8) {
            return res.status(400).json({
                error: "La contraseña nueva debe tener al menos 8 caracteres",
            });
        }

        if (password_nueva === password_actual) {
            return res.status(400).json({
                error: "La nueva contraseña debe ser diferente a la actual",
            });
        }

        // Verificar la contraseña actual intentando un signIn
        const { error: errLogin } = await supabase.auth.signInWithPassword({
            email: req.usuario.email,
            password: password_actual,
        });

        if (errLogin) {
            return res.status(401).json({ error: "Contraseña actual incorrecta" });
        }

        // Cambiar la password via Admin API
        const { error: errUpdate } = await supabase.auth.admin.updateUserById(
            req.usuario.id,
            { password: password_nueva }
        );

        if (errUpdate) {
            return res
                .status(500)
                .json({ error: "Error al actualizar la contraseña" });
        }

        // Marcar debe_cambiar_password = false en la tabla usuarios
        await supabase
            .from("usuarios")
            .update({ debe_cambiar_password: false })
            .eq("id", req.usuario.id);

        res.json({ mensaje: "Contraseña actualizada correctamente" });
    } catch (err) {
        console.error("Error cambiando password:", err);
        res.status(500).json({ error: "Error al cambiar la contraseña" });
    }

};