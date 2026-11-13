import { supabase } from "../config/supabase.js";
import { resolverIdentificador, obtenerPerfil } from "../services/auth.service.js";
import { crearNotificacion } from "../services/notificaciones.service.js";
import { suplenciaVigenteDePool, centrosCubiertosDeSuplencia } from "../services/suplencias.service.js";
import { estadoBloqueo, registrarFallo, limpiarIntentos } from "../services/loginIntentos.service.js";

const licenciaEstaVencida = (fechaVencimiento) => {
    if (!fechaVencimiento) return false;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const v = new Date(fechaVencimiento);
    v.setHours(0, 0, 0, 0);
    return v < hoy;
};


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

        const bloqueo = await estadoBloqueo(email);
        if (bloqueo.bloqueado) {
            const m = bloqueo.minutosRestantes;
            return res.status(429).json({
                error: `Demasiados intentos fallidos. Tu cuenta esta bloqueada temporalmente; intenta de nuevo en ${m} minuto${m === 1 ? '' : 's'}.`,
            });
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            const fallo = await registrarFallo(email);
            if (fallo.recienBloqueado) {
                return res.status(429).json({
                    error: `Demasiados intentos fallidos. Tu cuenta quedo bloqueada por seguridad; intenta de nuevo en ${fallo.minutos} minutos.`,
                });
            }
            return res.status(401).json({ error: 'Credenciales invalidas' });
        }

        limpiarIntentos(email);

        const perfil = await obtenerPerfil(data.user.id);

        if (!perfil.activo) {
            return res.status(403).json({
                error: 'Tu cuenta esta desactivada. Contacta al administrador del SENA para reactivarla.',
            });
        }

        perfil.suplencia = null;
        perfil.suplenciaCentros = [];
        perfil.centroActivo = null;
        if (perfil.rol === 'conductor' && perfil.es_pool === true && perfil.centro_id) {
            perfil.suplencia = await suplenciaVigenteDePool(perfil.id);
            if (perfil.suplencia) {
                perfil.suplenciaCentros = await centrosCubiertosDeSuplencia(perfil.suplencia);
                if (perfil.suplenciaCentros.length === 1) {
                    perfil.centroActivo = perfil.suplenciaCentros[0].id;
                }
            }
        }

        if (perfil.rol === 'conductor' && licenciaEstaVencida(perfil.licencia_vencimiento)) {
            const fechaLegible = new Date(perfil.licencia_vencimiento).toLocaleDateString('es-CO', {
                day: '2-digit', month: 'long', year: 'numeric',
            });
            crearNotificacion({
                tipo: 'licencia_vencida',
                titulo: `${perfil.nombre_completo} inició sesión con la licencia vencida`,
                mensaje: `Su licencia venció el ${fechaLegible}. Necesita renovarla para poder operar vehículos.`,
                url_destino: `/admin/usuarios/${perfil.id}`,
                centro_id: perfil.centro_id,
                conductor_id: perfil.id,
                dedupeHoras: 24,
                maxPorVentana: 5,
                soloCentro: true,
            }).catch((e) => console.warn('[notificaciones] login licencia vencida:', e.message));
        }

        res.json({
            token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expira_en: data.session.expires_in,
            usuario: {
                id: perfil.id,
                cedula: perfil.cedula,
                nombre_completo: perfil.nombre_completo,
                email: data.user.email,
                telefono: perfil.telefono,
                rol: perfil.rol,
                debe_cambiar_password: perfil.debe_cambiar_password,
                foto_url: perfil.foto_url,
                centro_id: perfil.centro_id,
                centro_nombre: perfil.centro_nombre,
                es_pool: perfil.es_pool === true,
                suplencia: perfil.suplencia || null,
                suplencia_centros: perfil.suplenciaCentros || [],
                centro_activo: perfil.centroActivo || null,
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
            es_pool: req.usuario.es_pool === true,
            suplencia: req.usuario.suplencia || null,
            suplencia_centros: req.usuario.suplenciaCentros || [],
            centro_activo: req.usuario.centroActivo || null,
        },
    });
};

export const actualizarMiPerfil = async (req, res) => {
    try {
        const { nombre_completo, telefono, foto_url } = req.body;

        const cambios = {};
        if (nombre_completo !== undefined) {
            const limpio = String(nombre_completo).trim();
            if (!limpio) {
                return res.status(400).json({ error: 'El nombre no puede estar vacio' });
            }
            cambios.nombre_completo = limpio;
        }
        if (telefono !== undefined) {
            cambios.telefono = telefono ? String(telefono).trim() : null;
        }
        if (foto_url !== undefined) {
            cambios.foto_url = foto_url || null;
        }

        if (Object.keys(cambios).length === 0) {
            return res.status(400).json({ error: 'No hay nada que actualizar' });
        }

        cambios.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('usuarios')
            .update(cambios)
            .eq('id', req.usuario.id)
            .select()
            .single();

        if (error) {
            console.error('Error actualizando mi perfil:', error);
            return res.status(500).json({ error: 'Error al actualizar el perfil' });
        }

        res.json({
            mensaje: 'Perfil actualizado correctamente',
            usuario: {
                id: data.id,
                cedula: data.cedula,
                nombre_completo: data.nombre_completo,
                telefono: data.telefono,
                email: req.usuario.email,
                rol: data.rol,
                foto_url: data.foto_url,
                debe_cambiar_password: data.debe_cambiar_password,
                licencia_numero: data.licencia_numero,
                licencia_categoria: data.licencia_categoria,
                licencia_vencimiento: data.licencia_vencimiento,
                centro_id: data.centro_id,
                centro_nombre: req.usuario.centro_nombre,
            },
        });
    } catch (err) {
        console.error('Error en actualizarMiPerfil:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const cambiarPassword = async (req, res) => {
    try {
        const { password_actual, password_nueva, password_confirmacion } = req.body;

        const esPrimerLogin = req.usuario.debe_cambiar_password === true;

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

        const { error: errUpdate } = await supabase.auth.admin.updateUserById(
            req.usuario.id,
            { password: password_nueva }
        );

        if (errUpdate) {
            return res
                .status(500)
                .json({ error: "Error al actualizar la contraseña" });
        }

        await supabase
            .from("usuarios")
            .update({ debe_cambiar_password: false })
            .eq("id", req.usuario.id);

        const { data: sesionNueva, error: errLoginNuevo } = await supabase.auth
            .signInWithPassword({
                email: req.usuario.email,
                password: password_nueva,
            });

        if (errLoginNuevo) {
            return res.json({
                mensaje: "Contraseña actualizada. Por favor inicia sesión de nuevo.",
                requiere_relogin: true,
            });
        }

        res.json({
            mensaje: "Contraseña actualizada correctamente",
            token: sesionNueva.session.access_token,
            refresh_token: sesionNueva.session.refresh_token,
            expira_en: sesionNueva.session.expires_in,
        });
    } catch (err) {
        console.error("Error cambiando password:", err);
        res.status(500).json({ error: "Error al cambiar la contraseña" });
    }

};