import { Router } from "express";
import {
    getCatalogo,
    getVehiculosDisponibles,
    postIniciarChequeo,
    putRespuestasChequeo,
    postCerrarChequeo,
    getChequeos,
    getChequeoPorId,
    getIntentosBloqueados,
    getMisChequeos,
    postAptitudNoApta,
    postAbandonarChequeo,
} from "../controllers/chequeos.controller.js";
import {
    verificarToken,
    adminOConductor,
    soloConductor,
    soloAdmin,
} from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verificarToken);

router.get("/catalogo", adminOConductor, getCatalogo);

router.get("/vehiculos-disponibles", soloConductor, getVehiculosDisponibles);

router.post("/iniciar", soloConductor, postIniciarChequeo);

router.post("/aptitud-no-apta", soloConductor, postAptitudNoApta);

router.put("/:id/respuestas", soloConductor, putRespuestasChequeo);

router.post("/:id/cerrar", soloConductor, postCerrarChequeo);

router.post("/:id/abandonar", adminOConductor, postAbandonarChequeo);

router.get("/mios", soloConductor, getMisChequeos);

router.get("/", soloAdmin, getChequeos);

router.get("/intentos-bloqueados", soloAdmin, getIntentosBloqueados);

router.get("/:id", soloAdmin, getChequeoPorId);

export default router;
