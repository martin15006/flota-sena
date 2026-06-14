// Endpoints de SUPLENCIA del Coordinador de Flota (Pool · Paso 2).
// Activar/desactivar/listar suplencias y ver la "Actividad del pool".
//
// Quien puede gestionar (requiereRol + validacion de scope dentro del servicio):
//   - superadmin (Director Nacional): en todo el pais.
//   - admin_departamental (Director Regional): centros de su departamento.
//   - admin_centro / admin (Coordinador titular): su propio centro.
// La validacion de que el centro esta dentro del area del actor se hace en el
// servicio con puedeAccederCentro().

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
