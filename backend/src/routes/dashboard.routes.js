import { Router } from 'express';
import { obtenerStatsDashboard } from '../controllers/dashboard.controller.js';
import { verificarToken, soloAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(verificarToken, soloAdmin);

router.get('/stats', obtenerStatsDashboard);

export default router;
