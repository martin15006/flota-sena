import { Router } from 'express';
import { login, obtenerActual, cambiarPassword, actualizarMiPerfil } from '../controllers/auth.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/login', login);
router.post('/cambiar-password', verificarToken, cambiarPassword);

router.get('/me', verificarToken, obtenerActual);

router.patch('/mi-perfil', verificarToken, actualizarMiPerfil);

export default router;