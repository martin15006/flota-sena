import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth.js";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { api } from "../../lib/api.js";
import { ETIQUETA_ROL, enSuplencia, esAdminEfectivo, necesitaElegirCentro, cubreVariosCentros } from "../../lib/roles.js";
import Sidebar from "./Sidebar.jsx";
import Campanita from "./Campanita.jsx";
import Footer from "../Footer/Footer.jsx";
import "./AdminLayout.css";

const STORAGE_KEY = "flota_sena__sidebar_colapsado";

const esMovil = () => window.innerWidth <= 900;

function AdminLayout({ titulo, children }) {
    const { usuario, cerrarSesion, actualizarUsuario } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!enSuplencia(usuario)) return;
        let cancelado = false;
        api("/auth/me")
            .then((data) => {
                if (cancelado) return;
                actualizarUsuario(data.usuario);
                if (!esAdminEfectivo(data.usuario)) {
                    navigate("/conductor", {
                        replace: true,
                        state: { suplenciaTerminada: true },
                    });
                }
            })
            .catch(() => {  });
        return () => { cancelado = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    const [sidebarAbierto, setSidebarAbierto] = useState(() => {
        if (typeof window === "undefined") return true;
        if (esMovil()) return false;
        return localStorage.getItem(STORAGE_KEY) !== "true";
    });

    useEffect(() => {
        const onResize = () => {
            if (esMovil()) {
                setSidebarAbierto(false);
            }
        };
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    const toggleSidebar = () => {
        setSidebarAbierto((abierto) => {
            const nuevo = !abierto;
            if (!esMovil()) {
                localStorage.setItem(STORAGE_KEY, nuevo ? "false" : "true");
            }
            return nuevo;
        });
    };

    const cerrar = () => {
        cerrarSesion();
        navigate("/login");
    };

    if (!usuario) return null;

    if (necesitaElegirCentro(usuario)) {
        return <Navigate to="/suplencia/centros" replace />;
    }

    const suplente = enSuplencia(usuario);
    const variosCentros = cubreVariosCentros(usuario);
    const centroActivoNombre = usuario.suplencia_centros?.find((c) => c.id === usuario.centro_activo)?.nombre
        || usuario.suplencia?.centro?.nombre
        || usuario.centro_nombre
        || "—";
    const deptoNombre = usuario.suplencia?.departamento?.nombre;

    return (
        <div className={`admin-layout ${sidebarAbierto ? "sidebar-abierto" : "sidebar-cerrado"}`}>
            <Sidebar
                abierto={sidebarAbierto}
                onCerrar={() => setSidebarAbierto(false)}
                usuario={usuario}
                onLogout={cerrar}
            />

            {sidebarAbierto && (
                <div
                    className="admin-layout-backdrop"
                    onClick={() => setSidebarAbierto(false)}
                    aria-hidden="true"
                />
            )}

            <div className="admin-layout-main">
                <header className="admin-layout-header">
                    <button
                        type="button"
                        className="admin-layout-hamburguesa"
                        onClick={toggleSidebar}
                        title={sidebarAbierto ? "Cerrar menú" : "Abrir menú"}
                        aria-label={sidebarAbierto ? "Cerrar menú" : "Abrir menú"}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </button>

                    {titulo && (
                        <h1 className="admin-layout-titulo">{titulo}</h1>
                    )}

                    <div className="admin-layout-acciones">
                        <Campanita />
                        <button
                            type="button"
                            className="admin-layout-perfil"
                            onClick={() => navigate("/admin/mi-perfil")}
                            title="Ver mi perfil"
                            aria-label="Ver mi perfil"
                        >
                            <div className="admin-layout-perfil-nombre">
                                {usuario.nombre_completo}
                            </div>
                            <span
                                className={`admin-layout-perfil-rol${enSuplencia(usuario) ? " admin-layout-perfil-rol-suplencia" : ""}`}
                            >
                                {enSuplencia(usuario)
                                    ? "Coordinador · suplencia"
                                    : ETIQUETA_ROL[usuario.rol] || usuario.rol}
                            </span>
                        </button>
                    </div>
                </header>

                {suplente && (
                    <div className="admin-layout-suplencia-bar">
                        <span className="admin-layout-suplencia-icono" aria-hidden="true">🏢</span>
                        <div className="admin-layout-suplencia-texto">
                            <span className="admin-layout-suplencia-label">Estás gestionando como suplente</span>
                            <span className="admin-layout-suplencia-centro">{centroActivoNombre}</span>
                        </div>
                        {deptoNombre && (
                            <span className="admin-layout-suplencia-regional">Regional {deptoNombre}</span>
                        )}
                        {variosCentros && (
                            <button
                                type="button"
                                className="admin-layout-suplencia-cambiar"
                                onClick={() => navigate("/suplencia/centros")}
                            >
                                Cambiar de centro
                            </button>
                        )}
                    </div>
                )}

                <main className="admin-layout-contenido">{children}</main>

                <Footer />
            </div>
        </div>
    );
}

export default AdminLayout;
