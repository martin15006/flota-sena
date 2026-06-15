import { Router } from 'express';
import { verificarToken, soloAdmin } from '../middlewares/auth.middleware.js';
import { exportarChequeo, exportarVehiculo, exportarConductor } from '../controllers/export.controller.js';

const router = Router();
router.use(verificarToken);
router.use(soloAdmin);

router.get('/chequeo/:id', exportarChequeo);
router.get('/vehiculo/:id', exportarVehiculo);
router.get('/conductor/:id', exportarConductor);

export default router;
