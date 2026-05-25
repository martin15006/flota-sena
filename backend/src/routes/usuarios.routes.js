import { Router } from 'express';
import {
    listarUsuarios,
    obtenerUsuario,
    crearUsuario,
    actualizarUsuario,
    desactivarUsuario,
    reactivarUsuario,
    eliminarUsuario,
    resetearPassword,
} from '../controllers/usuarios.controller.js';
import { verificarToken, soloAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(verificarToken, soloAdmin);

router.get('/', listarUsuarios);
router.get('/:id', obtenerUsuario);

router.post('/', crearUsuario);
router.post('/:id/resetear-password', resetearPassword);

router.patch('/:id', actualizarUsuario);
router.patch('/:id/desactivar', desactivarUsuario);
router.patch('/:id/reactivar', reactivarUsuario);

router.delete('/:id', eliminarUsuario);


export default router;