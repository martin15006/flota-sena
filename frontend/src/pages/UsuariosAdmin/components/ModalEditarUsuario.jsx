import { useState, useEffect, useRef } from "react";
import Modal from "../../../components/Modal/Modal.jsx";
import { api } from "../../../lib/api.js";
import ModalVerificacionAdmin from "./ModalVerificacionAdmin.jsx";
import './ModalCrearUsuario.css';

// Roles que requieren centro de formacion obligatorio (debe coincidir con el backend)
const ROLES_REQUIEREN_CENTRO = ["conductor", "admin_centro"];

// Filtros de input (los mismos que ModalCrearUsuario)
const soloLetrasYEspacios = (texto) =>
    (texto || "").replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]/g, "");
const soloDigitos = (texto) => (texto || "").replace(/\D/g, "");
const telefonoColombia = (texto) => (texto || "").replace(/[^\d+\-\s]/g, "");
const categoriaLicencia = (texto) =>
    (texto || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 2);

function ModalEditarUsuario({ abierto, onCerrar, usuario, onEditado }) {
    const [form, setForm] = useState({});
    const [foto, setFoto] = useState(null);
    const [fotoPreview, setFotoPreview] = useState(null);
    const [subiendoFoto, setSubiendoFoto] = useState(false);
    const [error, setError] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [centros, setCentros] = useState([]);
    // Avisos contextuales debajo de cada campo (mismo patron que ModalCrearUsuario)
    const [avisos, setAvisos] = useState({});
    const timersAvisos = useRef({});

    // Modal de verificacion del admin para cambios sensibles (correo / cedula)
    const [verificacion, setVerificacion] = useState(null); // null | "correo" | "cedula"

    // Copia local del usuario para reflejar cambios sensibles (correo/cedula)
    // sin tener que cerrar y reabrir el modal. La prop "usuario" sigue siendo la
    // fuente original; este estado solo se desvia cuando el admin cambia un campo
    // sensible desde el ModalVerificacionAdmin.
    const [usuarioLocal, setUsuarioLocal] = useState(usuario);

    const mostrarAviso = (campo, mensaje) => {
        if (timersAvisos.current[campo]) {
            clearTimeout(timersAvisos.current[campo]);
        }
        setAvisos((prev) => ({ ...prev, [campo]: mensaje }));
        timersAvisos.current[campo] = setTimeout(() => {
            setAvisos((prev) => {
                const copia = { ...prev };
                delete copia[campo];
                return copia;
            });
            delete timersAvisos.current[campo];
        }, 2500);
    };

    const filtrarConAviso = (valor, filtro, campo, mensajeAviso) => {
        const filtrado = filtro(valor);
        if (filtrado.length < valor.length) {
            mostrarAviso(campo, mensajeAviso);
        }
        return filtrado;
    };

    // Cargar la lista de centros activos al abrir el modal
    useEffect(() => {
        if (!abierto) return;
        api("/geo/centros")
            .then((data) => setCentros(data.centros || []))
            .catch((err) => {
                if (!err.sesionExpirada) {
                    console.error("Error cargando centros:", err.message);
                }
            });
    }, [abierto]);

    // rellena el formulario con los datos del usuario
    useEffect(() => {
        if (usuario && abierto) {
            setForm({
                nombre_completo: usuario.nombre_completo || '',
                telefono: usuario.telefono || '',
                rol: usuario.rol || 'conductor',
                centro_id: usuario.centro_id || '',
                licencia_numero: usuario.licencia_numero || '',
                licencia_categoria: usuario.licencia_categoria || '',
                licencia_vencimiento: usuario.licencia_vencimiento || '',
                eps: usuario.eps || '',
                arl: usuario.arl || '',
            });
            setFotoPreview(usuario.foto_url || null);
            setFoto(null);
            setError(null);
            // Reset de la copia local al abrir el modal (parte de la fuente original).
            setUsuarioLocal(usuario);
        }
    }, [usuario, abierto]);

    const centroEsObligatorio = ROLES_REQUIEREN_CENTRO.includes(form.rol);
    const esConductor = form.rol === "conductor";

    const cambiarCampo = (campo, valor) => setForm({ ...form, [campo]: valor });

    const cambiarFoto = (e) => {
        const archivo = e.target.files?.[0];
        if (!archivo) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) {
            setError('Solo se permiten imágenes JPEG, PNG o WebP');
            return;
        }
        if (archivo.size > 5 * 1024 * 1024) {
            setError('La imagen no debe superar los 5 MB');
            return;
        }
        setError(null);
        setFoto(archivo);
        const reader = new FileReader();
        reader.onload = (ev) => setFotoPreview(ev.target.result);
        reader.readAsDataURL(archivo);
    };

    const quitarFoto = () => {
        setFoto(null);
        setFotoPreview(null);
    };

    const enviar = async (e) => {
        e.preventDefault();
        setError(null);

        // Validacion frontend: si el rol lo requiere, centro obligatorio
        if (centroEsObligatorio && !form.centro_id) {
            setError(`El centro de formación es obligatorio para el rol '${form.rol}'`);
            return;
        }

        setCargando(true);

        try {
            let foto_url = usuario.foto_url;

            // si selecciona una nueva foto subirla 
            if (foto) {
                setSubiendoFoto(true);
                const fd = new FormData();
                fd.append('foto', foto);
                fd.append('folder', 'usuarios');

                const token = localStorage.getItem('token');
                const resp = await fetch('http://localhost:3001/api/upload/foto', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: fd,
                });
                const dataUpload = await resp.json();
                if (!resp.ok)
                    throw new Error(dataUpload.error || 'Error subiendo foto');
                foto_url = dataUpload.url;
                setSubiendoFoto(false);
            } else if (fotoPreview === null) {
                // quito la foto sin reemplazar 
                foto_url = null;
            }

            const datos = { ...form, foto_url };
            Object.keys(datos).forEach((k) => {
                if (datos[k] === '') datos[k] = null;
            });

            await api(`/usuarios/${usuario.id}`, {
                method: 'PATCH',
                body: datos,
            });

            onEditado(form.nombre_completo || usuario.nombre_completo);
            onCerrar();
        } catch (err) {
            setError(err.message);
        } finally {
            setCargando(false);
            setSubiendoFoto(false);
        }
    };

    if (!usuario) return null;

    return (
        <Modal
            abierto={abierto}
            onCerrar={onCerrar}
            titulo={`Editar · ${usuario.nombre_completo}`}
            ancho='grande'
        >
            <form className="form-usuario" onSubmit={enviar}>
                {/* foto  */}
                <div className="form-usuario-seccion">
                    <h3 className="form-usuario-seccion-titulo">Foto del usuario</h3>
                    <div className="form-usuario-foto-area">
                        {fotoPreview ? (
                            <div className="form-usuario-foto-preview-contenedor">
                                <img
                                    src={fotoPreview}
                                    alt="Preview"
                                    className="form-usuario-foto-preview"
                                />
                                <button
                                    type="button"
                                    className="form-usuario-foto-quitar"
                                    onClick={quitarFoto}
                                    disabled={cargando}
                                >
                                    Quitar
                                </button>
                            </div>
                        ) : (
                            <label className="form-usuario-foto-placeholder">
                                <span className="form-usuario-foto-icono">📷</span>
                                <span>Seleccionar foto</span>
                                <input
                                    type="file"
                                    accept="image/jpeg, image/png, image/webp"
                                    onChange={cambiarFoto}
                                    hidden
                                />
                            </label>
                        )}
                    </div>
                </div>

                <div className="form-usuario-seccion">
                    <h3 className="form-usuario-seccion-titulo">Datos básicos</h3>
                    <div className="form-usuario-grid">
                        <div className="form-usuario-campo">
                            <label className="form-usuario-label">Cédula</label>
                            <div className="form-usuario-campo-sensible">
                                <input
                                    type="text"
                                    className="form-usuario-input"
                                    value={usuarioLocal?.cedula || ""}
                                    disabled
                                />
                                <button
                                    type="button"
                                    className="form-usuario-boton-cambiar"
                                    onClick={() => setVerificacion("cedula")}
                                    disabled={cargando}
                                    title="Cambiar la cédula (requiere tu contraseña de admin)"
                                >
                                    🔒 Cambiar
                                </button>
                            </div>
                        </div>
                        <div className="form-usuario-campo">
                            <label className="form-usuario-label">Correo electrónico</label>
                            <div className="form-usuario-campo-sensible">
                                <input
                                    type="email"
                                    className="form-usuario-input"
                                    value={usuarioLocal?.email || "(sin correo registrado)"}
                                    disabled
                                />
                                <button
                                    type="button"
                                    className="form-usuario-boton-cambiar"
                                    onClick={() => setVerificacion("correo")}
                                    disabled={cargando || !usuarioLocal?.email}
                                    title={
                                        usuarioLocal?.email
                                            ? "Cambiar el correo (requiere tu contraseña de admin)"
                                            : "No hay correo registrado para este usuario"
                                    }
                                >
                                    🔒 Cambiar
                                </button>
                            </div>
                        </div>
                        <div className="form-usuario-campo">
                            <label className="form-usuario-label">Nombre completo *</label>
                            <input
                                type="text"
                                className="form-usuario-input"
                                value={form.nombre_completo || ""}
                                onChange={(e) =>
                                    cambiarCampo("nombre_completo", filtrarConAviso(
                                        e.target.value, soloLetrasYEspacios, "nombre_completo",
                                        "Solo se permiten letras y espacios"
                                    ))
                                }
                                placeholder="Solo letras"
                                required
                                disabled={cargando}
                            />
                            {avisos.nombre_completo && (
                                <small className="form-usuario-aviso-validacion">{avisos.nombre_completo}</small>
                            )}
                        </div>
                        <div className="form-usuario-campo">
                            <label className="form-usuario-label">Teléfono</label>
                            <input
                                type="tel"
                                inputMode="tel"
                                className="form-usuario-input"
                                value={form.telefono || ""}
                                onChange={(e) => cambiarCampo("telefono", filtrarConAviso(
                                    e.target.value, telefonoColombia, "telefono",
                                    "Solo se permiten números, espacios y signos + -"
                                ))}
                                placeholder="Ej: 3001234567"
                                disabled={cargando}
                            />
                            {avisos.telefono && (
                                <small className="form-usuario-aviso-validacion">{avisos.telefono}</small>
                            )}
                        </div>
                        <div className="form-usuario-campo">
                            <label className="form-usuario-label">Rol *</label>
                            <select
                                className="form-usuario-input"
                                value={form.rol || "conductor"}
                                onChange={(e) => cambiarCampo("rol", e.target.value)}
                                disabled={cargando}
                            >
                                <option value="conductor">Conductor</option>
                                <option value="admin">Administrador</option>
                            </select>
                        </div>
                        <div className="form-usuario-campo">
                            <label className="form-usuario-label">
                                Centro de formación {centroEsObligatorio && "*"}
                            </label>
                            <select
                                className="form-usuario-input"
                                value={form.centro_id || ""}
                                onChange={(e) => cambiarCampo("centro_id", e.target.value)}
                                required={centroEsObligatorio}
                                disabled={cargando || centros.length === 0}
                            >
                                <option value="">
                                    {centroEsObligatorio
                                        ? "— Selecciona un centro —"
                                        : "— Sin centro asignado —"}
                                </option>
                                {centros.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.nombre}
                                        {c.ciudad ? ` · ${c.ciudad}` : ""}
                                        {c.departamento ? ` (${c.departamento})` : ""}
                                    </option>
                                ))}
                            </select>
                            {centroEsObligatorio && (
                                <small className="form-usuario-ayuda">
                                    Obligatorio para conductores y administradores de centro.
                                </small>
                            )}
                        </div>
                    </div>
                </div>

                {esConductor && (
                    <div className="form-usuario-seccion">
                        <h3 className="form-usuario-seccion-titulo">
                            Licencia de conducción
                        </h3>
                        <div className="form-usuario-grid">
                            <div className="form-usuario-campo">
                                <label className="form-usuario-label">Número *</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    className="form-usuario-input"
                                    value={form.licencia_numero || ""}
                                    onChange={(e) =>
                                        cambiarCampo("licencia_numero", filtrarConAviso(
                                            e.target.value, soloDigitos, "licencia_numero",
                                            "Solo se permiten números"
                                        ))
                                    }
                                    placeholder="Solo números"
                                    required
                                    disabled={cargando}
                                />
                                {avisos.licencia_numero && (
                                    <small className="form-usuario-aviso-validacion">{avisos.licencia_numero}</small>
                                )}
                            </div>
                            <div className="form-usuario-campo">
                                <label className="form-usuario-label">Categoría *</label>
                                <input
                                    type="text"
                                    className="form-usuario-input"
                                    value={form.licencia_categoria || ""}
                                    onChange={(e) => {
                                        const raw = e.target.value;
                                        const procesado = categoriaLicencia(raw);
                                        if (raw.length > 2 && procesado.length === 2) {
                                            mostrarAviso("licencia_categoria", "Máximo 2 caracteres (ej: C2)");
                                        } else if (procesado.length < raw.length) {
                                            mostrarAviso("licencia_categoria", "Solo letras y números (ej: C2, B1)");
                                        }
                                        cambiarCampo("licencia_categoria", procesado);
                                    }}
                                    placeholder="Ej: C2, C3"
                                    required
                                    disabled={cargando}
                                />
                                {avisos.licencia_categoria && (
                                    <small className="form-usuario-aviso-validacion">{avisos.licencia_categoria}</small>
                                )}
                            </div>
                            <div className="form-usuario-campo">
                                <label className="form-usuario-label">
                                    Fecha de vencimiento *
                                </label>
                                <input
                                    type="date"
                                    className="form-usuario-input"
                                    value={form.licencia_vencimiento || ""}
                                    onChange={(e) =>
                                        cambiarCampo("licencia_vencimiento", e.target.value)
                                    }
                                    required
                                    disabled={cargando}
                                />
                            </div>
                        </div>
                        <small className="form-usuario-ayuda">
                            Obligatorio para conductores. Sin licencia vigente no se puede operar vehículos institucionales.
                        </small>
                    </div>
                )}

                <div className="form-usuario-seccion">
                    <h3 className="form-usuario-seccion-titulo">Seguridad social</h3>
                    <div className="form-usuario-grid">
                        <div className="form-usuario-campo">
                            <label className="form-usuario-label">EPS {esConductor && "*"}</label>
                            <input
                                type="text"
                                className="form-usuario-input"
                                value={form.eps || ""}
                                onChange={(e) => cambiarCampo("eps", e.target.value)}
                                required={esConductor}
                                disabled={cargando}
                            />
                        </div>
                        <div className="form-usuario-campo">
                            <label className="form-usuario-label">ARL {esConductor && "*"}</label>
                            <input
                                type="text"
                                className="form-usuario-input"
                                value={form.arl || ""}
                                onChange={(e) => cambiarCampo("arl", e.target.value)}
                                required={esConductor}
                                disabled={cargando}
                            />
                        </div>
                    </div>
                    {esConductor && (
                        <small className="form-usuario-ayuda">
                            Obligatoria para conductores. Cobertura ante accidente conduciendo el vehículo institucional.
                        </small>
                    )}
                </div>

                {error && (
                    <div className="form-usuario-error animar-shake">⚠️ {error}</div>
                )}

                {subiendoFoto && (
                    <div className="form-usuario-info">📤 Subiendo nueva foto...</div>
                )}

                <div className="form-usuario-acciones">
                    <button
                        type="button"
                        className="form-usuario-boton form-usuario-boton-cancelar"
                        onClick={onCerrar}
                        disabled={cargando}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="form-usuario-boton form-usuario-boton-crear"
                        disabled={cargando}
                    >
                        {cargando ? "Guardando..." : "Guardar cambios"}
                    </button>
                </div>
            </form>

            {/* Modal anidado para cambios sensibles (correo / cedula).
                - Le pasamos "usuarioLocal" para que muestre como "actual" el valor
                  ya actualizado si se hace un segundo cambio sin cerrar el modal padre.
                - El callback recibe (mensajeDelBackend, nuevoValor):
                    * mensajeDelBackend → para el toast del padre.
                    * nuevoValor        → para refrescar AL INSTANTE el campo en pantalla
                                          sin tener que cerrar y reabrir el modal. */}
            <ModalVerificacionAdmin
                abierto={verificacion !== null}
                onCerrar={() => setVerificacion(null)}
                tipo={verificacion}
                usuario={usuarioLocal}
                onCambiado={(mensajeDelBackend, nuevoValor) => {
                    // Actualizar la copia local SOLO en el campo que cambio.
                    // Asi el input del modal padre muestra el valor nuevo al instante.
                    const tipoActual = verificacion; // capturar antes del setState
                    setUsuarioLocal((prev) => ({
                        ...prev,
                        [tipoActual === "correo" ? "email" : "cedula"]: nuevoValor,
                    }));
                    onEditado(
                        form.nombre_completo || usuario.nombre_completo,
                        mensajeDelBackend
                    );
                    setVerificacion(null);
                }}
            />
        </Modal>
    );
}

export default ModalEditarUsuario;