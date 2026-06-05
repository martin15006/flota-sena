import { supabase} from '../config/supabase.js'
import { generarPasswordTemporal, contarAdminsActivos, registrarAuditoria, } from '../services/usuarios.service.js';


// Helper: indexa los emails de auth.users por id para hacer merge con la tabla usuarios.
// El email vive en auth.users (no en usuarios) porque Supabase Auth gestiona credenciales.
const obtenerMapaDeEmails = async () => {
    const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (error) {
        console.warn('[emails] Error en supabase.auth.admin.listUsers:', error.message);
        return {};
    }
    const mapa = {};
    (data?.users || []).forEach((u) => { mapa[u.id] = u.email; });
    return mapa;
};

export const listarUsuarios = async (req, res) => {
    try {
        const { rol, activo } = req.query;

        let query = supabase
            .from('usuarios')
            .select('*')
            .order('created_at', { ascending: false });

        if (rol) query = query.eq('rol', rol);
        if (activo !== undefined) query = query.eq('activo', activo === 'true');

        const [{ data, error }, mapaEmails] = await Promise.all([
            query,
            obtenerMapaDeEmails(),
        ]);

        if (error) throw error;

        // Mergeamos el email de auth.users en cada usuario
        const usuariosConEmail = (data || []).map((u) => ({
            ...u,
            email: mapaEmails[u.id] || null,
        }));

        res.json({ usuarios: usuariosConEmail });
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

        // Traer el email de auth.users por separado
        let email = null;
        try {
            const { data: authUser } = await supabase.auth.admin.getUserById(id);
            email = authUser?.user?.email || null;
        } catch (e) {
            console.warn('No se pudo obtener email de auth:', e.message);
        }

        res.json({ usuario: { ...data, email } });
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener usuario' });
    }
};


// Roles que requieren tener un centro de formacion asignado obligatoriamente.
// Conductor y admin_centro operan a nivel de un centro especifico, asi que sin
// centro asignado quedarian en estado invalido.
const ROLES_REQUIEREN_CENTRO = ['conductor', 'admin_centro'];

// Conductor requiere datos adicionales por ley colombiana: licencia vigente
// (legalidad para conducir) y seguridad social (cobertura ante accidente
// conduciendo el vehiculo institucional del SENA).
const validarRequisitosConductor = ({
    rol,
    licencia_numero,
    licencia_categoria,
    licencia_vencimiento,
    eps,
    arl,
}) => {
    if (rol !== 'conductor') return null;
    const faltantes = [];
    if (!licencia_numero?.trim()) faltantes.push('numero de licencia');
    if (!licencia_categoria?.trim()) faltantes.push('categoria de licencia');
    if (!licencia_vencimiento) faltantes.push('fecha de vencimiento de licencia');
    if (!eps?.trim()) faltantes.push('EPS');
    if (!arl?.trim()) faltantes.push('ARL');
    if (faltantes.length === 0) return null;
    return `Para registrar un conductor son obligatorios: ${faltantes.join(', ')}.`;
};

export const crearUsuario = async (req, res) => {
    try {
        const {
            cedula,
            nombre_completo,
            email,
            telefono,
            rol = 'conductor',
            centro_id,
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

        // Para conductor y admin_centro, el centro de formacion es obligatorio
        if (ROLES_REQUIEREN_CENTRO.includes(rol) && !centro_id) {
            return res.status(400).json({
                error: `El centro de formacion es obligatorio para el rol '${rol}'`,
            });
        }

        // Para conductor: licencia + seguridad social obligatorias
        const errorConductor = validarRequisitosConductor({
            rol,
            licencia_numero,
            licencia_categoria,
            licencia_vencimiento,
            eps,
            arl,
        });
        if (errorConductor) {
            return res.status(400).json({ error: errorConductor });
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
                centro_id: centro_id || null,
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
            centro_id,
            licencia_numero,
            licencia_categoria,
            licencia_vencimiento,
            eps,
            arl,
        } = req.body;

        // Traemos los datos actuales del usuario para validar contra el rol real
        const { data: usuarioActual } = await supabase
            .from('usuarios')
            .select('rol, licencia_numero, licencia_categoria, licencia_vencimiento, eps, arl')
            .eq('id', id)
            .maybeSingle();

        // Validar que no se le quite el centro a un conductor/admin_centro
        if ((centro_id === null || centro_id === '') &&
            usuarioActual && ROLES_REQUIEREN_CENTRO.includes(usuarioActual.rol)) {
            return res.status(400).json({
                error: `El centro de formacion es obligatorio para el rol '${usuarioActual.rol}'`,
            });
        }

        // Validar requisitos del conductor: tomamos los valores que vienen en el body,
        // o si no vienen, los actuales del usuario en BD. Asi cubrimos updates parciales.
        if (usuarioActual?.rol === 'conductor') {
            const errorConductor = validarRequisitosConductor({
                rol: 'conductor',
                licencia_numero: licencia_numero ?? usuarioActual.licencia_numero,
                licencia_categoria: licencia_categoria ?? usuarioActual.licencia_categoria,
                licencia_vencimiento: licencia_vencimiento ?? usuarioActual.licencia_vencimiento,
                eps: eps ?? usuarioActual.eps,
                arl: arl ?? usuarioActual.arl,
            });
            if (errorConductor) {
                return res.status(400).json({ error: errorConductor });
            }
        }

        // Solo incluir centro_id en el update si vino en el body (puede ser null si
        // explicitamente se quiere quitar para un admin_regional, etc.)
        const cambios = {
            nombre_completo,
            telefono,
            foto_url,
            licencia_numero,
            licencia_categoria,
            licencia_vencimiento,
            eps,
            arl,
        };
        if (centro_id !== undefined) cambios.centro_id = centro_id || null;

        const { data, error } = await supabase
            .from('usuarios')
            .update(cambios)
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

// -- Cambios sensibles con verificacion del admin --

// Verifica la contrasena del admin logueado. Devuelve true si es correcta.
// Para esto creamos un cliente "anon" temporal y hacemos signInWithPassword.
// Si funciona, la password es correcta; en cualquier otro caso, no.
const verificarPasswordAdmin = async (req, passwordRecibida) => {
    if (!passwordRecibida || !passwordRecibida.trim()) {
        return { ok: false, mensaje: 'Debes ingresar tu contrasena de administrador' };
    }

    // Necesitamos el email del admin para hacer signIn
    const { data: authAdmin } = await supabase.auth.admin.getUserById(req.usuario.id);
    const emailAdmin = authAdmin?.user?.email;
    if (!emailAdmin) {
        return { ok: false, mensaje: 'No se pudo identificar al administrador' };
    }

    // signInWithPassword va contra Supabase Auth. No necesitamos persistir la sesion.
    const { data, error } = await supabase.auth.signInWithPassword({
        email: emailAdmin,
        password: passwordRecibida,
    });

    if (error || !data?.user) {
        return { ok: false, mensaje: 'Contrasena del administrador incorrecta' };
    }
    return { ok: true };
};

// POST /api/usuarios/:id/cambiar-correo
// Body: { password_admin, nuevo_correo }
export const cambiarCorreo = async (req, res) => {
    try {
        const { id } = req.params;
        const { password_admin, nuevo_correo } = req.body;

        if (!nuevo_correo || !nuevo_correo.trim()) {
            return res.status(400).json({ error: 'El nuevo correo es obligatorio' });
        }
        // Validacion basica de formato (Supabase tambien lo valida)
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nuevo_correo.trim())) {
            return res.status(400).json({ error: 'El correo no tiene un formato valido' });
        }

        const verif = await verificarPasswordAdmin(req, password_admin);
        if (!verif.ok) {
            return res.status(403).json({ error: verif.mensaje });
        }

        // Aplicar el cambio en Supabase Auth
        const { data: actualizado, error: errUpdate } = await supabase.auth.admin.updateUserById(
            id,
            { email: nuevo_correo.trim() }
        );

        if (errUpdate) {
            return res.status(400).json({ error: errUpdate.message });
        }

        // Auditar el cambio
        await registrarAuditoria({
            usuarioAfectadoId: id,
            accionPorId: req.usuario.id,
            accion: 'cambio_correo',
            detalles: { nuevo_correo: nuevo_correo.trim() },
        });

        res.json({
            mensaje: 'Correo actualizado correctamente',
            email: actualizado?.user?.email,
        });
    } catch (err) {
        console.error('Error cambiando correo:', err);
        res.status(500).json({ error: err.message || 'Error al cambiar el correo' });
    }
};

// POST /api/usuarios/:id/cambiar-cedula
// Body: { password_admin, nueva_cedula }
export const cambiarCedula = async (req, res) => {
    try {
        const { id } = req.params;
        const { password_admin, nueva_cedula } = req.body;

        if (!nueva_cedula || !String(nueva_cedula).trim()) {
            return res.status(400).json({ error: 'La nueva cedula es obligatoria' });
        }
        const cedulaLimpia = String(nueva_cedula).replace(/\D/g, '');
        if (cedulaLimpia.length < 5) {
            return res.status(400).json({ error: 'La cedula debe tener al menos 5 digitos' });
        }

        const verif = await verificarPasswordAdmin(req, password_admin);
        if (!verif.ok) {
            return res.status(403).json({ error: verif.mensaje });
        }

        // Verificar que la nueva cedula no este ya en uso por otro usuario
        const { data: existente } = await supabase
            .from('usuarios')
            .select('id')
            .eq('cedula', cedulaLimpia)
            .neq('id', id)
            .maybeSingle();

        if (existente) {
            return res.status(400).json({
                error: 'Esa cedula ya esta en uso por otro usuario',
            });
        }

        // Aplicar el cambio
        const { data: actualizado, error: errUpdate } = await supabase
            .from('usuarios')
            .update({ cedula: cedulaLimpia })
            .eq('id', id)
            .select()
            .single();

        if (errUpdate) {
            return res.status(500).json({ error: errUpdate.message });
        }

        // Auditar
        await registrarAuditoria({
            usuarioAfectadoId: id,
            accionPorId: req.usuario.id,
            accion: 'cambio_cedula',
            detalles: { nueva_cedula: cedulaLimpia },
        });

        res.json({
            mensaje: 'Cedula actualizada correctamente',
            cedula: actualizado.cedula,
        });
    } catch (err) {
        console.error('Error cambiando cedula:', err);
        res.status(500).json({ error: err.message || 'Error al cambiar la cedula' });
    }
};


// =============================================================================
// GET /api/usuarios/:id/perfil-detalle
// =============================================================================
// Vista de "ficha completa" del usuario para el admin (Tarea #46).
// Trae en una sola respuesta todo lo necesario para la pagina de perfil:
//   - Datos personales del usuario (mismo formato que obtenerUsuario)
//   - Nombre del centro de formacion (join con centros_formacion)
//   - Si es conductor: contadores y resumen del ultimo chequeo
//   - Actividad reciente (ultimas 10 entradas de auditoria_usuarios)
//
// Se hace TODO en el backend en lugar de varias llamadas desde el frontend
// para no abrir varios round-trips de red ni filtrar/joinear en el cliente.
export const obtenerPerfilDetalle = async (req, res) => {
    try {
        const { id } = req.params;

        // 1) Datos del usuario + centro (join). Si el centro es null no rompe.
        const { data: usuario, error: errUsuario } = await supabase
            .from('usuarios')
            .select(`
                *,
                centros_formacion:centro_id (
                    id,
                    nombre,
                    ciudad_id
                )
            `)
            .eq('id', id)
            .single();

        if (errUsuario || !usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // 2) Email vive en auth.users (separado de la tabla usuarios)
        let email = null;
        try {
            const { data: authUser } = await supabase.auth.admin.getUserById(id);
            email = authUser?.user?.email || null;
        } catch (e) {
            console.warn('[perfil-detalle] no se pudo leer email:', e.message);
        }

        // 3) Si es conductor, traer contadores y ultimo chequeo en paralelo.
        // Si NO es conductor, dejamos las metricas en null (la UI no las mostrara).
        let chequeosResumen = null;
        if (usuario.rol === 'conductor') {
            const [
                { count: chequeosTotal },
                { count: intentosBloqueados },
                { data: ultimoChequeoArr },
            ] = await Promise.all([
                supabase
                    .from('chequeos_preoperacionales')
                    .select('id', { count: 'exact', head: true })
                    .eq('conductor_id', id)
                    .eq('cerrado', true),
                supabase
                    .from('intentos_chequeo_bloqueado')
                    .select('id', { count: 'exact', head: true })
                    .eq('conductor_id', id),
                supabase
                    .from('chequeos_preoperacionales')
                    .select(`
                        id,
                        fecha,
                        fecha_cierre,
                        resultado_estado,
                        resultado_criticidad,
                        cerrado,
                        vehiculos:vehiculo_id ( placa )
                    `)
                    .eq('conductor_id', id)
                    .order('created_at', { ascending: false })
                    .limit(1),
            ]);

            const ultimo = ultimoChequeoArr?.[0] || null;
            chequeosResumen = {
                total_cerrados: chequeosTotal || 0,
                intentos_bloqueados: intentosBloqueados || 0,
                ultimo: ultimo
                    ? {
                          id: ultimo.id,
                          fecha: ultimo.fecha,
                          fecha_cierre: ultimo.fecha_cierre,
                          resultado_estado: ultimo.resultado_estado,
                          resultado_criticidad: ultimo.resultado_criticidad,
                          cerrado: ultimo.cerrado,
                          placa: ultimo.vehiculos?.placa || null,
                      }
                    : null,
            };
        }

        // 4) Actividad reciente: ultimas 10 entradas de auditoria sobre este usuario.
        // Resolvemos el nombre del admin que ejecuto cada accion mediante un map.
        const { data: auditoriaRaw } = await supabase
            .from('auditoria_usuarios')
            .select('id, accion, detalles, created_at, accion_por_id')
            .eq('usuario_afectado_id', id)
            .order('created_at', { ascending: false })
            .limit(10);

        const auditoria = auditoriaRaw || [];
        const idsAdmins = [
            ...new Set(auditoria.map((a) => a.accion_por_id).filter(Boolean)),
        ];

        let mapaAdmins = {};
        if (idsAdmins.length > 0) {
            const { data: admins } = await supabase
                .from('usuarios')
                .select('id, nombre_completo')
                .in('id', idsAdmins);
            (admins || []).forEach((a) => { mapaAdmins[a.id] = a.nombre_completo; });
        }

        const actividadReciente = auditoria.map((a) => ({
            id: a.id,
            accion: a.accion,
            detalles: a.detalles,
            fecha: a.created_at,
            actor_nombre: mapaAdmins[a.accion_por_id] || 'Sistema',
        }));

        // 5) Respuesta unica con todo lo anterior
        const { centros_formacion, ...usuarioSinJoin } = usuario;
        res.json({
            usuario: {
                ...usuarioSinJoin,
                email,
                centro_nombre: centros_formacion?.nombre || null,
            },
            chequeos: chequeosResumen,
            actividad_reciente: actividadReciente,
        });
    } catch (err) {
        console.error('Error obteniendo perfil detalle:', err);
        res.status(500).json({ error: 'Error al obtener el perfil detalle' });
    }
};