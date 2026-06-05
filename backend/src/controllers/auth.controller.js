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

        // Llegamos aqui solo si la contraseña fue correcta (signInWithPassword OK).
        // Si la cuenta esta desactivada, devolvemos 403 con mensaje claro para que
        // el usuario sepa por que no puede entrar (no es un typo de contraseña).
        if (!perfil.activo) {
            return res.status(403).json({
                error: 'Tu cuenta esta desactivada. Contacta al administrador del SENA para reactivarla.',
            });
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
                centro_id: perfil.centro_id,
                centro_nombre: perfil.centro_nombre,
                licencia_numero: perfil.licencia_numero,
                licencia_categoria: perfil.licencia_categoria,
                licencia_vencimiento: perfil.licencia_vencimiento,
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
            centro_id: req.usuario.centro_id,
            centro_nombre: req.usuario.centro_nombre,
        },
    });
};

export const cambiarPassword = async (req, res) => {
    try {
        const { password_actual, password_nueva, password_confirmacion } = req.body;

        // En primer login el flujo es distinto: el usuario tiene una password temporal
        // que apunto pero ya no recuerda. Solo se le pide la nueva.
        // En cambio voluntario (debe_cambiar_password=false) si se pide la actual
        // como verificacion de identidad.
        const esPrimerLogin = req.usuario.debe_cambiar_password === true;

        // Validaciones basicas
        if (!password_nueva || !password_confirmacion) {
            return res.status(400).json({
                error: "La nueva contraseña y su confirmación son obligatorias",
            });
        }

        if (!esPrimerLogin && !password_actual) {
            return res.status(400).json({
                error: "Debes ingresar tu contraseña actual",
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

        // Solo en cambio voluntario verificamos la contraseña actual
        if (!esPrimerLogin) {
            if (password_nueva === password_actual) {
                return res.status(400).json({
                    error: "La nueva contraseña debe ser diferente a la actual",
                });
            }

            const { error: errLogin } = await supabase.auth.signInWithPassword({
                email: req.usuario.email,
                password: password_actual,
            });

            if (errLogin) {
                return res.status(401).json({ error: "Contraseña actual incorrecta" });
            }
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