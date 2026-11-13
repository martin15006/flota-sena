import { Router } from 'express';
import { verificarToken, requiereRol } from '../middlewares/auth.middleware.js';
import {
    postSuplencia,
    patchDesactivarSuplencia,
    getSuplencias,
    getActividadPool,
} from '../controllers/suplencias.controller.js';

const router = Router();

router.use(verificarToken);

const PUEDEN_GESTIONAR = ['superadmin', 'admin_departamental', 'admin_centro', 'admin'];

router.get('/', requiereRol(...PUEDEN_GESTIONAR), getSuplencias);
router.post('/', requiereRol(...PUEDEN_GESTIONAR), postSuplencia);
router.patch('/:id/desactivar', requiereRol(...PUEDEN_GESTIONAR), patchDesactivarSuplencia);
router.get('/actividad/:poolId', requiereRol(...PUEDEN_GESTIONAR), getActividadPool);

export default router;
