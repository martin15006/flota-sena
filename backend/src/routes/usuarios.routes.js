import { Router } from 'express';
import {
    listarUsuarios,
    obtenerUsuario,
    obtenerPerfilDetalle,
    crearUsuario,
    actualizarUsuario,
    desactivarUsuario,
    reactivarUsuario,
    eliminarUsuario,
    resetearPassword,
    cambiarCorreo,
    cambiarCedula,
} from '../controllers/usuarios.controller.js';
import { verificarToken, soloAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(verificarToken, soloAdmin);

router.get('/', listarUsuarios);
router.get('/:id/perfil-detalle', obtenerPerfilDetalle);
router.get('/:id', obtenerUsuario);

router.post('/', crearUsuario);
router.post('/:id/resetear-password', resetearPassword);
router.post('/:id/cambiar-correo', cambiarCorreo);
router.post('/:id/cambiar-cedula', cambiarCedula);

router.patch('/:id', actualizarUsuario);
router.patch('/:id/desactivar', desactivarUsuario);
router.patch('/:id/reactivar', reactivarUsuario);

router.delete('/:id', eliminarUsuario);


export default router;