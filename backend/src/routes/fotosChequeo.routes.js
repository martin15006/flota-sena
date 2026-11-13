import { Router } from "express";
import multer from "multer";
import {
    postFotoEvidencia,
    deleteFotoEvidencia,
    patchPreservarFoto,
    getFotosDeRespuesta,
} from "../controllers/fotosChequeo.controller.js";
import {
    verificarToken,
    soloConductor,
    soloAdmin,
} from "../middlewares/auth.middleware.js";

const router = Router();

const uploadFoto = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const permitidos = ["image/jpeg", "image/png", "image/webp"];
        const ok = permitidos.includes(file.mimetype);
        cb(ok ? null : new Error("Solo JPEG, PNG o WebP"), ok);
    },
});

router.use(verificarToken);

router.post("/:respuestaId/fotos", soloConductor, uploadFoto.single("foto"), postFotoEvidencia);

router.get("/:respuestaId/fotos", soloConductor, getFotosDeRespuesta);

router.delete("/fotos/:fotoId", soloConductor, deleteFotoEvidencia);

router.patch("/fotos/:fotoId/preservar", soloAdmin, patchPreservarFoto);

export default router;
