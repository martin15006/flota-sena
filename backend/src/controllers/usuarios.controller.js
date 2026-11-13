import { supabase} from '../config/supabase.js'
import { generarPasswordTemporal, contarAdminsActivos, registrarAuditoria, } from '../services/usuarios.service.js';
import { obtenerScope, usuarioEnScope } from '../services/scope.service.js';
import { puedeCrearRol, puedeGestionarRol, ETIQUETA_ROL, rolEfectivo as rolEfectivoActor } from '../services/jerarquia.service.js';
import { mapaSuplenciasVigentes, suplenciaVigenteDePool } from '../services/suplencias.service.js';


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

const verificarAccesoUsuarioObjetivo = async (req, idObjetivo, { exigirRango = true } = {}) => {
    if (idObjetivo === req.usuario.id) return { ok: true, usuario: null };

    const { data: objetivo } = await supabase
        .from('usuarios')
        .select('rol, centro_id, ciudad_id, departamento_id, region_id')
        .eq('id', idObjetivo)
        .maybeSingle();

    if (!objetivo) {
        return { ok: false, status: 404, error: 'Usuario no encontrado' };
    }

    const scope = await obtenerScope(req.usuario);
    if (!usuarioEnScope(scope, objetivo)) {
        return { ok: false, status: 403, error: 'Ese usuario no pertenece a tu area.' };
    }
    if (exigirRango && !puedeGestionarRol(rolEfectivoActor(req.usuario), objetivo.rol)) {
        return {
            ok: false,
            status: 403,
            error: `No puedes gestionar a un "${ETIQUETA_ROL[objetivo.rol] || objetivo.rol}". Solo puedes gestionar usuarios de rango inferior al tuyo.`,
        };
    }
    return { ok: true, usuario: objetivo };
};

const construirAmbito = (u) => {
    const rol = u.rol;
    if (rol === 'superadmin') return { nivel: 'nacional', etiqueta: 'Nacional', ciudad: null };
    if (rol === 'admin_departamental') return { nivel: 'departamento', etiqueta: u.departamento?.nombre || '—', ciudad: null };
    if (u.centro) return { nivel: 'centro', etiqueta: u.centro.nombre, ciudad: u.centro.ciudad?.nombre || null };
    if (rol === 'admin') return { nivel: 'nacional', etiqueta: 'General', ciudad: null };
    return { nivel: null, etiqueta: '—', ciudad: null };
};

export const listarUsuarios = async (req, res) => {
    try {
        const { rol, activo } = req.query;

        let query = supabase
            .from('usuarios')
            .select(`
                *,
                centro:centro_id ( nombre, ciudad:ciudad_id ( nombre ) ),
                ciudad:ciudad_id ( nombre ),
                departamento:departamento_id ( nombre ),
                region:region_id ( nombre )
            `)
            .order('created_at', { ascending: false });

        if (rol) query = query.eq('rol', rol);
        if (activo !== undefined) query = query.eq('activo', activo === 'true');

        const [{ data, error }, mapaEmails, scope] = await Promise.all([
            query,
            obtenerMapaDeEmails(),
            obtenerScope(req.usuario),
        ]);

        if (error) throw error;

        const visibles = (data || []).filter(
            (u) => u.id === req.usuario.id || usuarioEnScope(scope, u)
        );

        const usuariosConEmail = visibles.map((u) => {
            const { centro, ciudad, departamento, region, ...resto } = u;
            return {
                ...resto,
                email: mapaEmails[u.id] || null,
                ambito: construirAmbito(u),
            };
        });

        const poolIds = usuariosConEmail
            .filter((u) => u.rol === 'conductor' && u.es_pool)
            .map((u) => u.id);
        const mapaSup = await mapaSuplenciasVigentes(poolIds);
        const usuariosFinal = usuariosConEmail.map((u) => {
            const sup = mapaSup.get(u.id);
            return {
                ...u,
                supliendo: !!sup,
                suplencia_hasta: sup ? sup.hasta || null : null,
            };
        });

        res.json({ usuarios: usuariosFinal });
    } catch (err) {
        console.error('Error listando usuarios:', err);
        res.status(500).json({ error: 'Error al listar usuarios' });
    }
};


export const obtenerUsuario = async (req, res) => {
    try {
        const { id } = req.params;

        const acceso = await verificarAccesoUsuarioObjetivo(req, id, { exigirRango: false });
        if (!acceso.ok) {
            return res.status(acceso.status).json({ error: acceso.error });
        }

        const { data, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

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


const ROLES_REQUIEREN_CENTRO = ['conductor', 'admin_centro'];

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
            ciudad_id,
            departamento_id,
            region_id,
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

        if (!puedeCrearRol(rolEfectivoActor(req.usuario), rol)) {
            return res.status(403).json({
                error: `No tienes permiso para crear usuarios con el rol "${ETIQUETA_ROL[rol] || rol}". Solo puedes crear roles inferiores al tuyo.`,
            });
        }

        const scopeActor = await obtenerScope(req.usuario);
        if (scopeActor.tipo !== 'global') {
            const fueraDeArea =
                (centro_id && !scopeActor.centroIds.includes(centro_id)) ||
                (ciudad_id && !scopeActor.ciudadIds.includes(ciudad_id)) ||
                (departamento_id && !scopeActor.departamentoIds.includes(departamento_id)) ||
                (region_id && !scopeActor.regionIds.includes(region_id));
            if (fueraDeArea) {
                return res.status(403).json({
                    error: 'No puedes asignar un área (territorio) fuera de la tuya.',
                });
            }
        }

        if (ROLES_REQUIEREN_CENTRO.includes(rol) && !centro_id) {
            return res.status(400).json({
                error: `El centro de formacion es obligatorio para el rol '${rol}'`,
            });
        }

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
                ciudad_id: ciudad_id || null,
                departamento_id: departamento_id || null,
                region_id: region_id || null,
                debe_cambiar_password: true,
                licencia_numero,
                licencia_categoria,
                licencia_vencimiento,
                eps,
                arl,
                es_pool:
                    rol === 'conductor' &&
                    ['superadmin', 'admin_departamental'].includes(req.usuario.rol)
                        ? req.body.es_pool === true
                        : false,
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
            rol,
            centro_id,
            ciudad_id,
            departamento_id,
            region_id,
            licencia_numero,
            licencia_categoria,
            licencia_vencimiento,
            eps,
            arl,
        } = req.body;

        const { data: usuarioActual } = await supabase
            .from('usuarios')
            .select('rol, licencia_numero, licencia_categoria, licencia_vencimiento, eps, arl, centro_id, ciudad_id, departamento_id, region_id')
            .eq('id', id)
            .maybeSingle();

        if (!usuarioActual) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const scopeActor = await obtenerScope(req.usuario);

        if (id !== req.usuario.id) {
            if (!usuarioEnScope(scopeActor, usuarioActual)) {
                return res
                    .status(403)
                    .json({ error: 'Ese usuario no pertenece a tu area.' });
            }
            if (!puedeGestionarRol(rolEfectivoActor(req.usuario), usuarioActual.rol)) {
                return res.status(403).json({
                    error: `No puedes editar a un "${ETIQUETA_ROL[usuarioActual.rol] || usuarioActual.rol}". Solo puedes gestionar usuarios de rango inferior al tuyo.`,
                });
            }
        }

        const rolNuevo = rol && rol !== usuarioActual.rol ? rol : null;
        if (rolNuevo && id === req.usuario.id) {
            return res.status(400).json({ error: 'No puedes cambiar tu propio rol.' });
        }
        if (rolNuevo && !puedeCrearRol(rolEfectivoActor(req.usuario), rolNuevo)) {
            return res.status(403).json({
                error: `No puedes asignar el rol "${ETIQUETA_ROL[rolNuevo] || rolNuevo}". Solo puedes asignar roles inferiores al tuyo.`,
            });
        }
        const rolEfectivo = rolNuevo || usuarioActual.rol;

        if (ROLES_REQUIEREN_CENTRO.includes(rolEfectivo)) {
            const centroFinal = centro_id !== undefined ? centro_id : usuarioActual.centro_id;
            if (!centroFinal) {
                return res.status(400).json({
                    error: `El centro de formacion es obligatorio para el rol '${rolEfectivo}'`,
                });
            }
        }

        if (scopeActor.tipo !== 'global') {
            const fueraDeArea =
                (centro_id && !scopeActor.centroIds.includes(centro_id)) ||
                (ciudad_id && !scopeActor.ciudadIds.includes(ciudad_id)) ||
                (departamento_id && !scopeActor.departamentoIds.includes(departamento_id)) ||
                (region_id && !scopeActor.regionIds.includes(region_id));
            if (fueraDeArea) {
                return res.status(403).json({
                    error: 'No puedes asignar un área (territorio) fuera de la tuya.',
                });
            }
        }

        if (rolEfectivo === 'conductor') {
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
        if (rolNuevo) cambios.rol = rolNuevo;
        if (centro_id !== undefined) cambios.centro_id = centro_id || null;
        if (ciudad_id !== undefined) cambios.ciudad_id = ciudad_id || null;
        if (departamento_id !== undefined) cambios.departamento_id = departamento_id || null;
        if (region_id !== undefined) cambios.region_id = region_id || null;

        const actorEsDirector = ['superadmin', 'admin_departamental'].includes(req.usuario.rol);
        if (rolEfectivo !== 'conductor') {
            cambios.es_pool = false;
        } else if (req.body.es_pool !== undefined && actorEsDirector) {
            cambios.es_pool = req.body.es_pool === true;
        }

        if (cambios.es_pool === false) {
            await supabase
                .from('suplencias')
                .update({
                    activa: false,
                    desactivada_at: new Date().toISOString(),
                    desactivada_por_id: req.usuario.id,
                })
                .eq('pool_id', id)
                .eq('activa', true);
        }

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
            .select('rol, centro_id, ciudad_id, departamento_id, region_id')
            .eq('id', id)
            .single();

        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const scope = await obtenerScope(req.usuario);
        if (!usuarioEnScope(scope, usuario)) {
            return res
                .status(403)
                .json({ error: 'Ese usuario no pertenece a tu area.' });
        }

        if (!puedeGestionarRol(rolEfectivoActor(req.usuario), usuario.rol)) {
            return res.status(403).json({
                error: `No puedes desactivar a un "${ETIQUETA_ROL[usuario.rol] || usuario.rol}". Solo puedes gestionar usuarios de rango inferior al tuyo.`,
            });
        }

        if (usuario.rol === 'admin') {
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

        const { data: usuario } = await supabase
            .from('usuarios')
            .select('rol, centro_id, ciudad_id, departamento_id, region_id')
            .eq('id', id)
            .single();

        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const scope = await obtenerScope(req.usuario);
        if (!usuarioEnScope(scope, usuario)) {
            return res
                .status(403)
                .json({ error: 'Ese usuario no pertenece a tu area.' });
        }
        if (!puedeGestionarRol(rolEfectivoActor(req.usuario), usuario.rol)) {
            return res.status(403).json({
                error: `No puedes reactivar a un "${ETIQUETA_ROL[usuario.rol] || usuario.rol}". Solo puedes gestionar usuarios de rango inferior al tuyo.`,
            });
        }

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
            .select('rol, nombre_completo, centro_id, ciudad_id, departamento_id, region_id')
            .eq('id', id)
            .single();

        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const scope = await obtenerScope(req.usuario);
        if (!usuarioEnScope(scope, usuario)) {
            return res
                .status(403)
                .json({ error: 'Ese usuario no pertenece a tu area.' });
        }

        if (!puedeGestionarRol(rolEfectivoActor(req.usuario), usuario.rol)) {
            return res.status(403).json({
                error: `No puedes eliminar a un "${ETIQUETA_ROL[usuario.rol] || usuario.rol}". Solo puedes gestionar usuarios de rango inferior al tuyo.`,
            });
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

        if (req.usuario.suplencia) {
            return res.status(403).json({
                error: 'Como suplente no puedes resetear contrasenas. Eso lo hace el Coordinador titular.',
            });
        }

        const acceso = await verificarAccesoUsuarioObjetivo(req, id);
        if (!acceso.ok) {
            return res.status(acceso.status).json({ error: acceso.error });
        }

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

const verificarPasswordAdmin = async (req, passwordRecibida) => {
    if (!passwordRecibida || !passwordRecibida.trim()) {
        return { ok: false, mensaje: 'Debes ingresar tu contrasena de administrador' };
    }

    const { data: authAdmin } = await supabase.auth.admin.getUserById(req.usuario.id);
    const emailAdmin = authAdmin?.user?.email;
    if (!emailAdmin) {
        return { ok: false, mensaje: 'No se pudo identificar al administrador' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email: emailAdmin,
        password: passwordRecibida,
    });

    if (error || !data?.user) {
        return { ok: false, mensaje: 'Contrasena del administrador incorrecta' };
    }
    return { ok: true };
};

export const cambiarCorreo = async (req, res) => {
    try {
        const { id } = req.params;
        const { password_admin, nuevo_correo } = req.body;

        if (!nuevo_correo || !nuevo_correo.trim()) {
            return res.status(400).json({ error: 'El nuevo correo es obligatorio' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nuevo_correo.trim())) {
            return res.status(400).json({ error: 'El correo no tiene un formato valido' });
        }

        const acceso = await verificarAccesoUsuarioObjetivo(req, id);
        if (!acceso.ok) {
            return res.status(acceso.status).json({ error: acceso.error });
        }

        const verif = await verificarPasswordAdmin(req, password_admin);
        if (!verif.ok) {
            return res.status(403).json({ error: verif.mensaje });
        }

        const { data: actualizado, error: errUpdate } = await supabase.auth.admin.updateUserById(
            id,
            { email: nuevo_correo.trim() }
        );

        if (errUpdate) {
            return res.status(400).json({ error: errUpdate.message });
        }

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

        const acceso = await verificarAccesoUsuarioObjetivo(req, id);
        if (!acceso.ok) {
            return res.status(acceso.status).json({ error: acceso.error });
        }

        const verif = await verificarPasswordAdmin(req, password_admin);
        if (!verif.ok) {
            return res.status(403).json({ error: verif.mensaje });
        }

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

        const { data: actualizado, error: errUpdate } = await supabase
            .from('usuarios')
            .update({ cedula: cedulaLimpia })
            .eq('id', id)
            .select()
            .single();

        if (errUpdate) {
            return res.status(500).json({ error: errUpdate.message });
        }

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


export const obtenerPerfilDetalle = async (req, res) => {
    try {
        const { id } = req.params;

        const acceso = await verificarAccesoUsuarioObjetivo(req, id, { exigirRango: false });
        if (!acceso.ok) {
            return res.status(acceso.status).json({ error: acceso.error });
        }

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

        let email = null;
        try {
            const { data: authUser } = await supabase.auth.admin.getUserById(id);
            email = authUser?.user?.email || null;
        } catch (e) {
            console.warn('[perfil-detalle] no se pudo leer email:', e.message);
        }

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

        let supliendo = false;
        if (usuario.rol === 'conductor' && usuario.es_pool && usuario.centro_id) {
            supliendo = !!(await suplenciaVigenteDePool(usuario.id));
        }

        const { centros_formacion, ...usuarioSinJoin } = usuario;
        res.json({
            usuario: {
                ...usuarioSinJoin,
                email,
                centro_nombre: centros_formacion?.nombre || null,
                supliendo,
            },
            chequeos: chequeosResumen,
            actividad_reciente: actividadReciente,
        });
    } catch (err) {
        console.error('Error obteniendo perfil detalle:', err);
        res.status(500).json({ error: 'Error al obtener el perfil detalle' });
    }
};