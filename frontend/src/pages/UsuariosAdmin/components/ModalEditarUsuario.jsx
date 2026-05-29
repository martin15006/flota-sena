import { useState, useEffect } from "react";
import Modal from "../../../components/Modal/Modal.jsx";
import { api } from "../../../lib/api.js";
import './ModalCrearUsuario.css';

function ModalEditarUsuario({ abierto, onCerrar, usuario, onEditado }) {
    const [form, setForm] = useState({});
    const [foto, setFoto] = useState(null);
    const [fotoPreview, setFotoPreview] = useState(null);
    const [subiendoFoto, setSubiendoFoto] = useState(false);
    const [error, setError] = useState(null);
    const [cargando, setCargando] = useState(false);


    // rellena el formulario con los datos del usuario 
    useEffect(() => {
        if (usuario && abierto) {
            setForm({
                nombre_completo: usuario.nombre_completo || '',
                telefono: usuario.telefono || '',
                rol: usuario.rol || 'conductor',
                licencia_numero: usuario.licencia_numero || '',
                licencia_categoria: usuario.licencia_categoria || '',
                licencia_vencimiento: usuario.licencia_vencimiento || '',
                eps: usuario.eps || '',
                arl: usuario.arl || '',
            });
            setFotoPreview(usuario.foto_url || null);
            setFoto(null);
            setError(null);
        }
    }, [usuario, abierto]);

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

            onEditado();
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
                            <label className="form-usuario-label">Cédula (no editable)</label>
                            <input
                                type="text"
                                className="form-usuario-input"
                                value={usuario.cedula}
                                disabled
                            />
                        </div>
                        <div className="form-usuario-campo">
                            <label className="form-usuario-label">Nombre completo *</label>
                            <input
                                type="text"
                                className="form-usuario-input"
                                value={form.nombre_completo || ""}
                                onChange={(e) =>
                                    cambiarCampo("nombre_completo", e.target.value)
                                }
                                required
                                disabled={cargando}
                            />
                        </div>
                        <div className="form-usuario-campo">
                            <label className="form-usuario-label">Teléfono</label>
                            <input
                                type="tel"
                                className="form-usuario-input"
                                value={form.telefono || ""}
                                onChange={(e) => cambiarCampo("telefono", e.target.value)}
                                disabled={cargando}
                            />
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
                    </div>
                </div>

                {form.rol === "conductor" && (
                    <div className="form-usuario-seccion">
                        <h3 className="form-usuario-seccion-titulo">
                            Licencia de conducción
                        </h3>
                        <div className="form-usuario-grid">
                            <div className="form-usuario-campo">
                                <label className="form-usuario-label">Número</label>
                                <input
                                    type="text"
                                    className="form-usuario-input"
                                    value={form.licencia_numero || ""}
                                    onChange={(e) =>
                                        cambiarCampo("licencia_numero", e.target.value)
                                    }
                                    disabled={cargando}
                                />
                            </div>
                            <div className="form-usuario-campo">
                                <label className="form-usuario-label">Categoría</label>
                                <input
                                    type="text"
                                    className="form-usuario-input"
                                    value={form.licencia_categoria || ""}
                                    onChange={(e) =>
                                        cambiarCampo("licencia_categoria", e.target.value)
                                    }
                                    disabled={cargando}
                                />
                            </div>
                            <div className="form-usuario-campo">
                                <label className="form-usuario-label">
                                    Fecha de vencimiento
                                </label>
                                <input
                                    type="date"
                                    className="form-usuario-input"
                                    value={form.licencia_vencimiento || ""}
                                    onChange={(e) =>
                                        cambiarCampo("licencia_vencimiento", e.target.value)
                                    }
                                    disabled={cargando}
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div className="form-usuario-seccion">
                    <h3 className="form-usuario-seccion-titulo">Seguridad social</h3>
                    <div className="form-usuario-grid">
                        <div className="form-usuario-campo">
                            <label className="form-usuario-label">EPS</label>
                            <input
                                type="text"
                                className="form-usuario-input"
                                value={form.eps || ""}
                                onChange={(e) => cambiarCampo("eps", e.target.value)}
                                disabled={cargando}
                            />
                        </div>
                        <div className="form-usuario-campo">
                            <label className="form-usuario-label">ARL</label>
                            <input
                                type="text"
                                className="form-usuario-input"
                                value={form.arl || ""}
                                onChange={(e) => cambiarCampo("arl", e.target.value)}
                                disabled={cargando}
                            />
                        </div>
                    </div>
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
        </Modal>
    );
}

export default ModalEditarUsuario;