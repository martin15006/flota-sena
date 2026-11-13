import { Router } from "express";
import {
    getCategorias, postCategoria, putCategoria, deleteCategoria,
    getItems, postItem, putItem, deleteItem,
    getPreguntas, postPregunta, putPregunta, deletePregunta,
} from "../controllers/catalogoAdmin.controller.js";
import { verificarToken, soloAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verificarToken);
router.use(soloAdmin);

router.get("/categorias", getCategorias);
router.post("/categorias", postCategoria);
router.put("/categorias/:id", putCategoria);
router.delete("/categorias/:id", deleteCategoria);

router.get("/items", getItems);
router.post("/items", postItem);
router.put("/items/:id", putItem);
router.delete("/items/:id", deleteItem);

router.get("/preguntas-aptitud", getPreguntas);
router.post("/preguntas-aptitud", postPregunta);
router.put("/preguntas-aptitud/:id", putPregunta);
router.delete("/preguntas-aptitud/:id", deletePregunta);

export default router;
