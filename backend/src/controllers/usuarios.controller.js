import { supabase} from '../config/supabase.js'
import { generarPasswordTemporal, contarAdminsActivos, registrarAuditoria, } from '../services/usuarios.service.js';


export const listarUsuarios = async (req, res) => {
    try {
        const { rol, activo } = req.query;

        let query = supabase
            .from('usuarios')
            .select('*')
            .order('created_at', { ascending: false });

        if (rol) query = query.eq('rol', rol);
        if (activo !== undefined) query = query.eq('activo', activo === 'true');

        const { data, error } = await query;

        if (error) throw error;
        res.json({ usuarios: data });
    } catch (err) {
        console.error('Error listando usuarios:', err);
        res.status(500).json({ error: 'Error al listar usuarios' });
    }
};


export const obtenerUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ usuario: data });
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener usuario' });
    }
};


export const crearUsuario = async (req, res) => {
    try {
        const {
            cedula,
            nombre_completo,
            email,
            telefono,
            rol = 'conductor',
            licencia_numero,
            licencia_categoria,
            licencia_vencimiento,
            eps,
            arl,
        } = req.body;

        if (!cedula || !nombre_completo || !email) {
            return res
                .status(400)
                .json({ error: 'cedula, nombre_completo y email son obligatorios' });
        }

        const { data: existente } = await supabase
            .from('usuarios')
            .select('id')
            .eq('cedula', cedula)
            .maybeSingle();

        if (existente) {
            return res
                .status(400)
                .json({ error: 'Ya existe un usuario con esa cedula' });
        }

        const passwordTemporal = generarPasswordTemporal();

        // crear en supabase auth 
        const { data: authData, error: errAuth } =
            await supabase.auth.admin.createUser({
                email,
                password: passwordTemporal,
                email_confirm: true,
            });

        if (errAuth) {
            return res.status(400).json({ error: errAuth.message });
        }

        const { data: nuevoUsuario, error: errInsert } = await supabase
            .from('usuarios')
            .insert({
                id: authData.user.id,
                cedula,
                nombre_completo,
                telefono,
                rol,
                debe_cambiar_password: true,
                licencia_numero,
                licencia_categoria,
                licencia_vencimiento,
                eps,
                arl
            })
            .select()
            .single();

        if (errInsert) {
            await supabase.auth.admin.deleteUser(authData.user.id);
            return res.status(500).json({ error: errInsert.message });
        }

        await registrarAuditoria({
            usuarioAfectadoId: nuevoUsuario.id,
            accionPorId: req.usuario.id,
            accion: 'creado',
            detalles: { email, rol },
        });

        res.status(201).json({
            usuario: nuevoUsuario,
            password_temporal: passwordTemporal,
            email,
        });
    } catch (err) {
        console.error('Error creando usuario:', err);
        res.status(500).json({ error: 'Error al crear usuario' });
    }
};

export const actualizarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            nombre_completo,
            telefono,
            foto_url,
            licencia_numero,
            licencia_categoria,
            licencia_vencimiento,
            eps,
            arl,
        } = req.body;

        const { data, error } = await supabase
            .from('usuarios')
            .update({
                nombre_completo,
                telefono,
                foto_url,
                licencia_numero,
                licencia_categoria,
                licencia_vencimiento,
                eps,
                arl,
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        await registrarAuditoria({
            usuarioAfectadoId: id,
            accionPorId: req.usuario.id,
            accion: 'actualizado',
            detalles: req.body,
        });

        res.json({ usuario: data })
    } catch (err) {
        console.error('Error actualizando usuario:', err);
        res.status(500).json({ error: 'Error al actualizar usuario' });
    }
};


export const desactivarUsuario = async (req, res) => {
    try {
        const { id } = req.params;

        if (id === req.usuario.id) {
            return res
                .status(400)
                .json({ error: 'No puedes desactivarte a ti mismo' });
        }

        const { data: usuario } = await supabase
            .from('usuarios')
            .select('rol')
            .eq('id', id)
            .single();

        if (usuario?.rol === 'admin') {
            const adminsActivos = await contarAdminsActivos();
            if (adminsActivos <= 1) {
                return res.status(400).json({
                    error: 'No se puede desactivar al ultimo admin activo',
                });
            }
        }

        const { error } = await supabase
            .from('usuarios')
            .update({ activo: false })
            .eq('id', id);

        if (error) throw error;

        await registrarAuditoria({
            usuarioAfectadoId: id,
            accionPorId: req.usuario.id,
            accion: 'desactivado',
        });

        res.json({ mensaje: 'Usuario desactivado' });
    } catch (err) {
        res.status(500).json({ error: 'Error al desactivar usuario' });
    }
};


export const reactivarUsuario = async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('usuarios')
            .update({ activo: true })
            .eq('id', id);

        if (error) throw error;

        await registrarAuditoria({
            usuarioAfectadoId: id,
            accionPorId: req.usuario.id,
            accion: 'reactivado',
        });

        res.json({ mensaje: 'Usuario reactivado' });
    } catch (err) {
        res.status(500).json({ error: 'Error al reactivar usuario' });
    }
};


export const eliminarUsuario = async (req, res) => {
    try {
        const { id } = req.params;

        if (id === req.usuario.id) {
            return res
                .status(400)
                .json({ error: 'No puedes eliminarte a ti mismo' });
        }

        const { data: usuario } = await supabase
            .from('usuarios')
            .select('rol, nombre_completo')
            .eq('id', id)
            .single();

        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        if (usuario.rol === 'admin') {
            const adminsActivos = await contarAdminsActivos();
            if (adminsActivos <= 1) {
                return res.status(400).json({
                    error: 'No se puede eliminar al ultimo admin activo',
                });
            }
        }

        await registrarAuditoria({
            usuarioAfectadoId: id,
            accionPorId: req.usuario.id,
            accion: 'eliminado',
            detalles: { nombre: usuario.nombre_completo, rol: usuario.rol },
        });

        const { error } = await supabase.auth.admin.deleteUser(id);

        if (error) throw error;

        res.json({ mensaje: 'Usuario eliminado permanentemente' });
    } catch (err) {
        console.error('Error eliminando usuario:', err);
        res.status(500).json({ error: 'Error al eliminar usuario' });
    }
};


export const resetearPassword = async (req, res) => {
    try {
        const { id } = req.params;

        const passwordTemporal = generarPasswordTemporal();

        const { error: errAuth } = await supabase.auth.admin.updateUserById(id, {
            password: passwordTemporal,
        });

        if (errAuth) {
            return res.status(400).json({ error: errAuth.message });
        }

        await supabase
            .from('usuarios')
            .update({ debe_cambiar_password: true })
            .eq('id', id);

        await registrarAuditoria({
            usuarioAfectadoId: id,
            accionPorId: req.usuario.id,
            accion: 'password_reseteado',
        });

        const { data: authData } = await supabase.auth.admin.getUserById(id);

        res.json({
            mensaje: 'password reseteada',
            password_temporal: passwordTemporal,
            email: authData?.user?.email,
        });
    } catch (err) {
        console.error('Error reseteando password:', err);
        res.status(500).json({ error: 'Error al resetear password' });
    }
};