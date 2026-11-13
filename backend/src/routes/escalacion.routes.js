import { Router } from 'express';
import { verificarToken, soloAdmin } from '../middlewares/auth.middleware.js';
import { getSuperior, postInforme } from '../controllers/escalacion.controller.js';

const router = Router();
router.use(verificarToken);
router.use(soloAdmin);

router.get('/superior', getSuperior);
router.post('/informe', postInforme);

export default router;
