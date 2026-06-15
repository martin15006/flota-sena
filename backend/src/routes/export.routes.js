import { Router } from 'express';
import { verificarToken, soloAdmin } from '../middlewares/auth.middleware.js';
import { exportarChequeo } from '../controllers/export.controller.js';

const router = Router();
router.use(verificarToken);
router.use(soloAdmin);

router.get('/chequeo/:id', exportarChequeo);

export default router;
