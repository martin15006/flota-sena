import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, API_URL } from "../../lib/api.js";
import {
    obtenerChequeoEnCurso,
    actualizarChequeoEnCurso,
    limpiarChequeoEnCurso,
} from "../../lib/chequeoEnCurso.js";
import Toast from "../../components/Toast/Toast.jsx";
import useTimeoutAbandono from "../../hooks/useTimeoutAbandono.js";
import "./ChequeoItems.css";

const MAX_FOTOS_POR_ITEM = 3;
const TAMANO_MAX_FOTO = 5 * 1024 * 1024;
const MIN_OBSERVACION_PARA_FOTOS = 5;

const API_URL_BASE = API_URL;

const comprimirImagen = (file, maxLado = 1600, calidad = 0.85) => {
    return new Promise((resolve, reject) => {
        const lector = new FileReader();
        lector.onerror = () => reject(new Error("No se pudo leer el archivo"));
        lector.onload = (e) => {
            const img = new Image();
            img.onerror = () => reject(new Error("La imagen no se pudo procesar"));
            img.onload = () => {
                let { width, height } = img;
                if (width > maxLado || height > maxLado) {
                    const ratio = Math.min(maxLado / width, maxLado / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(
                    (blob) => {
                        if (!blob) return reject(new Error("Error generando la imagen comprimida"));
                        const nombre = file.name.replace(/\.[^.]+$/, ".jpg");
                        resolve(new File([blob], nombre, {
                            type: "image/jpeg",
                            lastModified: Date.now(),
                        }));
                    },
                    "image/jpeg",
                    calidad
                );
            };
            img.src = e.target.result;
        };
        lector.readAsDataURL(file);
    });
};

const subirFotoAlBackend = async (respuestaId, file) => {
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("foto", file);

    const resp = await fetch(`${API_URL_BASE}/respuestas/${respuestaId}/fotos`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data.error || `Error ${resp.status}`);
    return data.foto;
};

function ChequeoItems() {
    const navigate = useNavigate();

    const [chequeoEnCurso, setChequeoEnCurso] = useState(null);
    const [categorias, setCategorias] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    useTimeoutAbandono(chequeoEnCurso?.chequeo_id);

    const [indiceCategoria, setIndiceCategoria] = useState(0);
    const [respuestasPorItem, setRespuestasPorItem] = useState({});

    const [idsRespuestaPorItem, setIdsRespuestaPorItem] = useState({});
    const [fotosPorItem, setFotosPorItem] = useState({});
    const [subiendoFoto, setSubiendoFoto] = useState({});
    const inputGaleriaRefs = useRef({});
    const inputCamaraRefs = useRef({});

    const [errorCategoria, setErrorCategoria] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [confirmarCierre, setConfirmarCierre] = useState(false);
    const [cerrando, setCerrando] = useState(false);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        const enCurso = obtenerChequeoEnCurso();
        if (!enCurso || !enCurso.chequeo_id) {
            navigate("/conductor");
            return;
        }
        setChequeoEnCurso(enCurso);
        if (enCurso.respuestas_items) {
            setRespuestasPorItem(enCurso.respuestas_items);
        }
        if (enCurso.ids_respuesta_por_item) {
            setIdsRespuestaPorItem(enCurso.ids_respuesta_por_item);
        }
        if (enCurso.fotos_por_item) {
            setFotosPorItem(enCurso.fotos_por_item);
        }
        if (typeof enCurso.indice_categoria === "number") {
            setIndiceCategoria(enCurso.indice_categoria);
        }
    }, [navigate]);

    useEffect(() => {
        if (!chequeoEnCurso) return;
        api("/chequeos/catalogo")
            .then((data) => {
                const cats = (data.categorias || []).sort((a, b) => a.orden - b.orden);
                cats.forEach((c) => {
                    c.items = (c.items || []).sort((a, b) => a.orden - b.orden);
                });
                setCategorias(cats);
            })
            .catch((err) => {
                if (!err.sesionExpirada) setError(err.message);
            })
            .finally(() => setCargando(false));
    }, [chequeoEnCurso]);

    useEffect(() => {
        if (!chequeoEnCurso) return;
        actualizarChequeoEnCurso({
            respuestas_items: respuestasPorItem,
            ids_respuesta_por_item: idsRespuestaPorItem,
            fotos_por_item: fotosPorItem,
            indice_categoria: indiceCategoria,
        });
    }, [respuestasPorItem, idsRespuestaPorItem, fotosPorItem, indiceCategoria, chequeoEnCurso]);

    const categoriaActual = categorias[indiceCategoria];
    const totalCategorias = categorias.length;
    const esUltimaCategoria = indiceCategoria === totalCategorias - 1;

    const itemsConRespuesta = useMemo(() => {
        if (!categoriaActual) return [];
        return categoriaActual.items.map((item) => ({
            ...item,
            respuesta: respuestasPorItem[item.id] || null,
        }));
    }, [categoriaActual, respuestasPorItem]);

    const totalRespondidosCategoria = itemsConRespuesta.filter(
        (i) => i.respuesta?.estado
    ).length;

    const setEstado = async (itemId, estado) => {
        const fotosActuales = fotosPorItem[itemId] || [];
        const estabaEnNoCumple = respuestasPorItem[itemId]?.estado === "no_cumple";

        if (estabaEnNoCumple && estado !== "no_cumple" && fotosActuales.length > 0) {
            const confirma = window.confirm(
                `Este ítem tiene ${fotosActuales.length} foto${fotosActuales.length === 1 ? "" : "s"} de evidencia. Si cambias el estado, se eliminarán. ¿Continuar?`
            );
            if (!confirma) return;

            for (const foto of fotosActuales) {
                try {
                    await api(`/respuestas/fotos/${foto.id}`, { method: "DELETE" });
                } catch (err) {
                    if (!err.sesionExpirada) {
                        console.error("Error borrando foto:", err.message);
                    }
                }
            }
            setFotosPorItem((prev) => {
                const copia = { ...prev };
                delete copia[itemId];
                return copia;
            });
        }

        setRespuestasPorItem((prev) => {
            const actual = prev[itemId] || { observacion: "" };
            const nuevo = { ...actual, estado };
            if (estado !== "no_cumple") {
                nuevo.observacion = "";
            }
            return { ...prev, [itemId]: nuevo };
        });
        setErrorCategoria(null);
    };

    const obtenerOIniciarRespuestaId = async (itemId) => {
        const yaTiene = idsRespuestaPorItem[itemId];
        if (yaTiene) return yaTiene;

        const respuestaLocal = respuestasPorItem[itemId];
        if (!respuestaLocal || respuestaLocal.estado !== "no_cumple") {
            throw new Error("Solo se pueden subir fotos a items marcados como NO CUMPLE");
        }
        if (!respuestaLocal.observacion?.trim()) {
            throw new Error("Escribe primero la observación del problema");
        }

        const resp = await api(`/chequeos/${chequeoEnCurso.chequeo_id}/respuestas`, {
            method: "PUT",
            body: {
                respuestas: [{
                    item_id: itemId,
                    estado: respuestaLocal.estado,
                    observacion: respuestaLocal.observacion,
                }],
            },
        });
        const guardada = (resp.respuestas_guardadas || [])[0];
        if (!guardada?.id) {
            throw new Error("El servidor no devolvió el id de la respuesta guardada");
        }
        setIdsRespuestaPorItem((prev) => ({ ...prev, [itemId]: guardada.id }));
        return guardada.id;
    };

    const onClickGaleria = (itemId) => {
        const ref = inputGaleriaRefs.current[itemId];
        if (ref) ref.click();
    };

    const onClickCamara = (itemId) => {
        const ref = inputCamaraRefs.current[itemId];
        if (ref) ref.click();
    };

    const subirFoto = async (itemId, file) => {
        if (!file.type.startsWith("image/")) {
            setToast({ mensaje: "El archivo no es una imagen válida", tipo: "error" });
            return;
        }

        setSubiendoFoto((prev) => ({ ...prev, [itemId]: true }));
        try {
            let fileFinal;
            try {
                fileFinal = await comprimirImagen(file);
            } catch (err) {
                setToast({ mensaje: `Error procesando la imagen: ${err.message}`, tipo: "error" });
                return;
            }

            if (fileFinal.size > TAMANO_MAX_FOTO) {
                setToast({
                    mensaje: "La foto sigue siendo demasiado grande después de procesarla. Intenta con otra.",
                    tipo: "error",
                });
                return;
            }

            const respuestaId = await obtenerOIniciarRespuestaId(itemId);
            const fotoCreada = await subirFotoAlBackend(respuestaId, fileFinal);
            setFotosPorItem((prev) => ({
                ...prev,
                [itemId]: [...(prev[itemId] || []), fotoCreada],
            }));
            setToast({ mensaje: "Foto subida correctamente", tipo: "exito" });
        } catch (err) {
            if (!err.sesionExpirada) {
                setToast({ mensaje: err.message, tipo: "error" });
            }
        } finally {
            setSubiendoFoto((prev) => ({ ...prev, [itemId]: false }));
        }
    };

    const eliminarFoto = async (itemId, fotoId) => {
        if (!window.confirm("¿Eliminar esta foto?")) return;
        try {
            await api(`/respuestas/fotos/${fotoId}`, { method: "DELETE" });
            setFotosPorItem((prev) => ({
                ...prev,
                [itemId]: (prev[itemId] || []).filter((f) => f.id !== fotoId),
            }));
            setToast({ mensaje: "Foto eliminada", tipo: "exito" });
        } catch (err) {
            if (!err.sesionExpirada) {
                setToast({ mensaje: err.message, tipo: "error" });
            }
        }
    };

    const setObservacion = (itemId, observacion) => {
        setRespuestasPorItem((prev) => {
            const actual = prev[itemId] || { estado: null };
            return { ...prev, [itemId]: { ...actual, observacion } };
        });
        setErrorCategoria(null);
    };

    const validarCategoria = () => {
        const faltantes = itemsConRespuesta.filter((i) => !i.respuesta?.estado);
        if (faltantes.length > 0) {
            setErrorCategoria(
                `Te falta marcar ${faltantes.length} ítem${faltantes.length === 1 ? "" : "s"} en esta categoría.`
            );
            return false;
        }
        const sinObs = itemsConRespuesta.filter(
            (i) => i.respuesta?.estado === "no_cumple" && !i.respuesta?.observacion?.trim()
        );
        if (sinObs.length > 0) {
            setErrorCategoria(
                `Hay ${sinObs.length} ítem${sinObs.length === 1 ? "" : "s"} marcado${sinObs.length === 1 ? "" : "s"} como NO CUMPLE sin observación. La observación es obligatoria.`
            );
            return false;
        }
        return true;
    };

    const guardarRespuestasCategoria = async () => {
        const payload = itemsConRespuesta.map((i) => ({
            item_id: i.id,
            estado: i.respuesta.estado,
            observacion: i.respuesta.observacion || null,
        }));
        const resp = await api(`/chequeos/${chequeoEnCurso.chequeo_id}/respuestas`, {
            method: "PUT",
            body: { respuestas: payload },
        });
        const nuevosIds = {};
        (resp.respuestas_guardadas || []).forEach((r) => {
            if (r.id && r.item_id) nuevosIds[r.item_id] = r.id;
        });
        if (Object.keys(nuevosIds).length > 0) {
            setIdsRespuestaPorItem((prev) => ({ ...prev, ...nuevosIds }));
        }
    };

    const irACategoriaAnterior = () => {
        if (indiceCategoria === 0) return;
        setIndiceCategoria(indiceCategoria - 1);
        setErrorCategoria(null);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const irACategoriaSiguiente = async () => {
        if (!validarCategoria()) return;
        setGuardando(true);
        try {
            await guardarRespuestasCategoria();
            setIndiceCategoria(indiceCategoria + 1);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (err) {
            if (!err.sesionExpirada) {
                setErrorCategoria(err.message);
            }
        } finally {
            setGuardando(false);
        }
    };

    const intentarFinalizar = () => {
        if (!validarCategoria()) return;
        setConfirmarCierre(true);
    };

    const cerrarChequeo = async () => {
        setCerrando(true);
        try {
            await guardarRespuestasCategoria();
            const resp = await api(`/chequeos/${chequeoEnCurso.chequeo_id}/cerrar`, {
                method: "POST",
                body: {},
            });
            actualizarChequeoEnCurso({
                paso: "resultado",
                resultado: resp,
            });
            navigate("/conductor/chequeo/resultado");
        } catch (err) {
            if (!err.sesionExpirada) {
                setErrorCategoria(err.message);
            }
            setConfirmarCierre(false);
        } finally {
            setCerrando(false);
        }
    };

    const cancelarTodo = () => {
        if (window.confirm(
            "¿Cancelar el chequeo? Perderás las respuestas que no estén guardadas."
        )) {
            limpiarChequeoEnCurso();
            navigate("/conductor");
        }
    };

    if (cargando) {
        return (
            <div className="items-pagina">
                <div className="items-estado">Cargando catálogo...</div>
            </div>
        );
    }
    if (error) {
        return (
            <div className="items-pagina">
                <div className="items-estado items-estado-error">{error}</div>
                <button className="items-boton-volver" onClick={cancelarTodo}>
                    Volver al inicio
                </button>
            </div>
        );
    }
    if (!categoriaActual) {
        return (
            <div className="items-pagina">
                <div className="items-estado items-estado-error">No hay categorías disponibles.</div>
            </div>
        );
    }

    return (
        <div className="items-pagina">
            <header className="items-header">
                <button className="items-volver-chip" onClick={cancelarTodo}>
                    ← Cancelar
                </button>
                <img src="/logoverde.png" alt="SENA" className="items-mini-logo" />
                <div className="items-header-titulo">
                    <div className="items-header-paso">
                        Categoría {indiceCategoria + 1} de {totalCategorias}
                    </div>
                    <div className="items-header-vehiculo">
                        {chequeoEnCurso?.vehiculo?.placa || "—"}
                    </div>
                </div>
            </header>

            <div className="items-progreso-categorias">
                {categorias.map((_, i) => (
                    <div
                        key={i}
                        className={
                            "items-progreso-bloque" +
                            (i < indiceCategoria ? " items-progreso-completo" : "") +
                            (i === indiceCategoria ? " items-progreso-actual" : "")
                        }
                    />
                ))}
            </div>

            <main className="items-main">
                <section className="items-cat-encabezado">
                    {categoriaActual.icono && (
                        <div className="items-cat-icono">{categoriaActual.icono}</div>
                    )}
                    <div className="items-cat-textos">
                        <h1 className="items-cat-titulo">{categoriaActual.nombre}</h1>
                        {categoriaActual.descripcion && (
                            <p className="items-cat-descripcion">{categoriaActual.descripcion}</p>
                        )}
                        <div className="items-cat-progreso-texto">
                            {totalRespondidosCategoria} de {itemsConRespuesta.length} ítems respondidos
                        </div>
                    </div>
                </section>

                <section className="items-lista">
                    {itemsConRespuesta.map((item) => (
                        <article key={item.id} className="items-card">
                            <div className="items-card-encabezado">
                                <div className="items-card-descripcion">
                                    {item.descripcion}
                                </div>
                                {item.es_critico && (
                                    <span className="items-card-badge-critico">CRÍTICO</span>
                                )}
                            </div>

                            {item.descripcion_larga && (
                                <div className="items-card-larga">{item.descripcion_larga}</div>
                            )}

                            <div className="items-card-botones">
                                <button
                                    className={
                                        "items-card-boton items-card-boton-cumple" +
                                        (item.respuesta?.estado === "cumple" ? " items-card-boton-activo" : "")
                                    }
                                    onClick={() => setEstado(item.id, "cumple")}
                                >
                                    Cumple
                                </button>
                                <button
                                    className={
                                        "items-card-boton items-card-boton-no-cumple" +
                                        (item.respuesta?.estado === "no_cumple" ? " items-card-boton-activo" : "")
                                    }
                                    onClick={() => setEstado(item.id, "no_cumple")}
                                >
                                    No cumple
                                </button>
                                <button
                                    className={
                                        "items-card-boton items-card-boton-na" +
                                        (item.respuesta?.estado === "no_aplica" ? " items-card-boton-activo" : "")
                                    }
                                    onClick={() => setEstado(item.id, "no_aplica")}
                                >
                                    N/A
                                </button>
                            </div>

                            {item.respuesta?.estado === "no_cumple" && (
                                <>
                                    <div className="items-card-obs-wrap">
                                        <label className="items-card-obs-label">
                                            Observación <span className="items-card-obs-obligatoria">(obligatoria)</span>
                                        </label>
                                        <textarea
                                            className="items-card-obs"
                                            placeholder="Describe el problema detectado..."
                                            rows={3}
                                            value={item.respuesta.observacion || ""}
                                            onChange={(e) => setObservacion(item.id, e.target.value)}
                                        />
                                    </div>

                                    {(() => {
                                        const fotosActuales = fotosPorItem[item.id] || [];
                                        const obsCount = item.respuesta.observacion?.trim().length || 0;
                                        const obsLista = obsCount >= MIN_OBSERVACION_PARA_FOTOS;
                                        const subiendo = subiendoFoto[item.id];
                                        const lleno = fotosActuales.length >= MAX_FOTOS_POR_ITEM;
                                        const botonesDeshabilitados = subiendo || !obsLista || lleno;

                                        return (
                                            <div className="items-card-fotos-wrap">
                                                <div className="items-card-fotos-label">
                                                    Evidencia fotográfica <span className="items-card-fotos-opcional">(opcional)</span>
                                                </div>

                                                {!obsLista && (
                                                    <div className="items-card-fotos-aviso">
                                                        Escribe primero la observación (mínimo {MIN_OBSERVACION_PARA_FOTOS} caracteres) para poder adjuntar fotos.
                                                    </div>
                                                )}

                                                {obsLista && (
                                                    <div className="items-card-fotos-ayuda">
                                                        Adjunta hasta {MAX_FOTOS_POR_ITEM} fotos del problema. JPG, PNG o WebP, máx 5 MB cada una.
                                                    </div>
                                                )}

                                                {fotosActuales.length > 0 && (
                                                    <div className="items-card-fotos-grid">
                                                        {fotosActuales.map((f) => (
                                                            <div key={f.id} className="items-card-foto-mini">
                                                                <img src={f.url} alt="Evidencia" />
                                                                <button
                                                                    type="button"
                                                                    className="items-card-foto-eliminar"
                                                                    onClick={() => eliminarFoto(item.id, f.id)}
                                                                    aria-label="Eliminar foto"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {!lleno && (
                                                    <>
                                                        <input
                                                            ref={(el) => { inputCamaraRefs.current[item.id] = el; }}
                                                            type="file"
                                                            accept="image/*"
                                                            capture="environment"
                                                            style={{ display: "none" }}
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) subirFoto(item.id, file);
                                                                e.target.value = "";
                                                            }}
                                                        />
                                                        <input
                                                            ref={(el) => { inputGaleriaRefs.current[item.id] = el; }}
                                                            type="file"
                                                            accept="image/jpeg,image/png,image/webp"
                                                            style={{ display: "none" }}
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) subirFoto(item.id, file);
                                                                e.target.value = "";
                                                            }}
                                                        />

                                                        <div className="items-card-fotos-botones">
                                                            <button
                                                                type="button"
                                                                className="items-card-foto-boton items-card-foto-boton-camara"
                                                                onClick={() => onClickCamara(item.id)}
                                                                disabled={botonesDeshabilitados}
                                                            >
                                                                Tomar foto
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="items-card-foto-boton items-card-foto-boton-galeria"
                                                                onClick={() => onClickGaleria(item.id)}
                                                                disabled={botonesDeshabilitados}
                                                            >
                                                                Subir foto
                                                            </button>
                                                        </div>

                                                        {subiendo && (
                                                            <div className="items-card-fotos-subiendo">Subiendo foto...</div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </>
                            )}
                        </article>
                    ))}
                </section>

                {errorCategoria && (
                    <div className="items-error-categoria">{errorCategoria}</div>
                )}

                <section className="items-nav-botones">
                    <button
                        className="items-nav-boton items-nav-boton-atras"
                        onClick={irACategoriaAnterior}
                        disabled={indiceCategoria === 0 || guardando || cerrando}
                    >
                        ← Anterior
                    </button>

                    {esUltimaCategoria ? (
                        <button
                            className="items-nav-boton items-nav-boton-finalizar"
                            onClick={intentarFinalizar}
                            disabled={guardando || cerrando}
                        >
                            Finalizar chequeo
                        </button>
                    ) : (
                        <button
                            className="items-nav-boton items-nav-boton-siguiente"
                            onClick={irACategoriaSiguiente}
                            disabled={guardando || cerrando}
                        >
                            {guardando ? "Guardando..." : "Siguiente →"}
                        </button>
                    )}
                </section>
            </main>

            {confirmarCierre && (
                <div className="items-modal-overlay">
                    <div className="items-modal">
                        <div className="items-modal-icono">?</div>
                        <h2 className="items-modal-titulo">¿Finalizar el chequeo?</h2>
                        <p className="items-modal-texto">
                            Una vez finalizado <strong>no podrás editar</strong> las respuestas.
                            El sistema calculará el estado del vehículo según tus respuestas.
                        </p>
                        <div className="items-modal-botones">
                            <button
                                className="items-modal-boton items-modal-boton-cancelar"
                                onClick={() => setConfirmarCierre(false)}
                                disabled={cerrando}
                            >
                                Volver al chequeo
                            </button>
                            <button
                                className="items-modal-boton items-modal-boton-confirmar"
                                onClick={cerrarChequeo}
                                disabled={cerrando}
                            >
                                {cerrando ? "Finalizando..." : "Sí, finalizar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <Toast
                    mensaje={toast.mensaje}
                    tipo={toast.tipo}
                    duracion={3500}
                    posicion="arriba-centro"
                    onCerrar={() => setToast(null)}
                />
            )}
        </div>
    );
}

export default ChequeoItems;
