import { Router } from 'express';
import {
    getMisNotificaciones,
    getContadorNoLeidas,
    patchMarcarLeida,
    patchMarcarTodasLeidas,
} from '../controllers/notificaciones.controller.js';
import { verificarToken, soloAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(verificarToken, soloAdmin);

router.get('/no-leidas/count', getContadorNoLeidas);
router.patch('/leer-todas', patchMarcarTodasLeidas);

router.get('/', getMisNotificaciones);
router.patch('/:id/leer', patchMarcarLeida);

export default router;
