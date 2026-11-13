import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { api, API_URL } from "../../lib/api.js";
import AdminLayout from "../../components/AdminLayout/AdminLayout.jsx";
import Toast from "../../components/Toast/Toast.jsx";
import { ETIQUETA_ROL } from "../../lib/roles.js";
import "./MiPerfil.css";

function MiPerfil() {
    const { usuario, actualizarUsuario } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        nombre_completo: "",
        telefono: "",
    });
    const [foto, setFoto] = useState(null);
    const [fotoPreview, setFotoPreview] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [subiendoFoto, setSubiendoFoto] = useState(false);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState(null);

    const [avisos, setAvisos] = useState({});
    const timersAvisos = useRef({});

    const fileInputRef = useRef(null);

    const mostrarToast = (mensaje, tipo = "exito") => setToast({ mensaje, tipo });

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

    useEffect(() => {
        if (usuario) {
            setForm({
                nombre_completo: usuario.nombre_completo || "",
                telefono: usuario.telefono || "",
            });
            setFotoPreview(usuario.foto_url || null);
        }
    }, [usuario]);

    if (!usuario) return null;

    const inicial = usuario.nombre_completo?.charAt(0).toUpperCase() || "U";

    const soloLetrasYEspacios = (texto) =>
        (texto || "").replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]/g, "");
    const telefonoColombia = (texto) =>
        (texto || "").replace(/[^\d+\-\s]/g, "");

    const cambiarFoto = (e) => {
        const archivo = e.target.files?.[0];
        if (!archivo) return;
        if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type)) {
            setError("Solo se permiten imágenes JPEG, PNG o WebP");
            return;
        }
        if (archivo.size > 5 * 1024 * 1024) {
            setError("La imagen no debe superar los 5 MB");
            return;
        }
        setError(null);
        setFoto(archivo);
        const reader = new FileReader();
        reader.onload = (ev) => setFotoPreview(ev.target.result);
        reader.readAsDataURL(archivo);
    };

    const guardar = async (e) => {
        e.preventDefault();
        setError(null);
        setCargando(true);

        try {
            let foto_url = usuario.foto_url;

            if (foto) {
                setSubiendoFoto(true);
                const fd = new FormData();
                fd.append("foto", foto);
                fd.append("folder", "usuarios");
                const token = localStorage.getItem("token");
                const resp = await fetch(
                    `${API_URL}/upload/foto`,
                    {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}` },
                        body: fd,
                    }
                );
                const dataUpload = await resp.json();
                if (!resp.ok) {
                    throw new Error(dataUpload.error || "Error subiendo la foto");
                }
                foto_url = dataUpload.url;
                setSubiendoFoto(false);
            }

            const resp = await api("/auth/mi-perfil", {
                method: "PATCH",
                body: {
                    nombre_completo: form.nombre_completo,
                    telefono: form.telefono,
                    foto_url,
                },
            });

            if (actualizarUsuario) actualizarUsuario(resp.usuario);

            mostrarToast(resp.mensaje || "Perfil actualizado correctamente", "exito");
            setFoto(null);
        } catch (err) {
            if (!err.sesionExpirada) setError(err.message);
        } finally {
            setCargando(false);
            setSubiendoFoto(false);
        }
    };

    return (
        <AdminLayout titulo="Mi perfil">
            <div className="mi-perfil-contenedor animar-fade-in-up">
                <section className="mi-perfil-hero">
                    {fotoPreview ? (
                        <img
                            src={fotoPreview}
                            alt={usuario.nombre_completo}
                            className="mi-perfil-foto"
                        />
                    ) : (
                        <div className="mi-perfil-foto-placeholder">{inicial}</div>
                    )}
                    <h2 className="mi-perfil-nombre">{usuario.nombre_completo}</h2>
                    <div className="mi-perfil-rol">{ETIQUETA_ROL[usuario.rol] || usuario.rol}</div>
                    {usuario.centro_nombre && (
                        <div className="mi-perfil-centro">{usuario.centro_nombre}</div>
                    )}

                    <input
                        type="file"
                        accept="image/jpeg, image/png, image/webp"
                        ref={fileInputRef}
                        onChange={cambiarFoto}
                        hidden
                    />
                    <button
                        type="button"
                        className="mi-perfil-boton-foto"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={cargando}
                    >
                        {foto ? "Cambiar foto seleccionada" : "Cambiar foto"}
                    </button>
                    {foto && (
                        <small className="mi-perfil-foto-pendiente">
                            Hay una foto nueva sin guardar. Pulsa "Guardar cambios" abajo.
                        </small>
                    )}
                </section>

                <form className="mi-perfil-form" onSubmit={guardar}>
                    <h3 className="mi-perfil-seccion-titulo">Datos personales</h3>

                    <div className="mi-perfil-campo">
                        <label className="mi-perfil-label">
                            Cédula
                            <span className="mi-perfil-bloqueado-mini">🔒 protegida</span>
                        </label>
                        <input
                            type="text"
                            className="mi-perfil-input mi-perfil-input-bloqueado"
                            value={usuario.cedula || ""}
                            disabled
                            readOnly
                        />
                    </div>

                    <div className="mi-perfil-campo">
                        <label className="mi-perfil-label">
                            Correo electrónico
                            <span className="mi-perfil-bloqueado-mini">🔒 protegido</span>
                        </label>
                        <input
                            type="email"
                            className="mi-perfil-input mi-perfil-input-bloqueado"
                            value={usuario.email || "(sin correo)"}
                            disabled
                            readOnly
                        />
                    </div>

                    <div className="mi-perfil-aviso-bloqueado">
                        <strong>¿Necesitas cambiar tu cédula o correo?</strong>{" "}
                        {usuario?.rol === "superadmin"
                            ? "Eres el nivel más alto del sistema: estos datos se gestionan directamente con el soporte técnico de la plataforma."
                            : "Por seguridad, estos datos solo pueden ser modificados por un administrador de rango superior. Contáctalo si los datos son incorrectos."}
                    </div>

                    <div className="mi-perfil-campo">
                        <label className="mi-perfil-label">Nombre completo *</label>
                        <input
                            type="text"
                            className="mi-perfil-input"
                            value={form.nombre_completo}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    nombre_completo: filtrarConAviso(
                                        e.target.value,
                                        soloLetrasYEspacios,
                                        "nombre_completo",
                                        "Solo se permiten letras y espacios"
                                    ),
                                })
                            }
                            placeholder="Tu nombre completo"
                            required
                            disabled={cargando}
                        />
                        {avisos.nombre_completo && (
                            <small className="mi-perfil-aviso-validacion">
                                {avisos.nombre_completo}
                            </small>
                        )}
                    </div>

                    <div className="mi-perfil-campo">
                        <label className="mi-perfil-label">Teléfono</label>
                        <input
                            type="tel"
                            inputMode="tel"
                            className="mi-perfil-input"
                            value={form.telefono}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    telefono: filtrarConAviso(
                                        e.target.value,
                                        telefonoColombia,
                                        "telefono",
                                        "Solo se permiten números, espacios y signos + -"
                                    ),
                                })
                            }
                            placeholder="Ej: 3001234567"
                            disabled={cargando}
                        />
                        {avisos.telefono && (
                            <small className="mi-perfil-aviso-validacion">
                                {avisos.telefono}
                            </small>
                        )}
                    </div>

                    {error && (
                        <div className="mi-perfil-error animar-shake">⚠️ {error}</div>
                    )}

                    {subiendoFoto && (
                        <div className="mi-perfil-info">📤 Subiendo nueva foto...</div>
                    )}

                    <div className="mi-perfil-acciones">
                        <button
                            type="button"
                            className="mi-perfil-boton-pass"
                            onClick={() => navigate("/cambiar-password")}
                            disabled={cargando}
                        >
                            🔑 Cambiar mi contraseña
                        </button>
                        <button
                            type="submit"
                            className="mi-perfil-boton-guardar"
                            disabled={cargando}
                        >
                            {cargando ? "Guardando..." : "Guardar cambios"}
                        </button>
                    </div>
                </form>
            </div>

            {toast && (
                <Toast
                    mensaje={toast.mensaje}
                    tipo={toast.tipo}
                    duracion={3500}
                    posicion="arriba-centro"
                    onCerrar={() => setToast(null)}
                />
            )}
        </AdminLayout>
    );
}

export default MiPerfil;
