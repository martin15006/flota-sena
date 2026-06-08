// Layout reutilizable para todas las paginas del admin (Bloque B Fase 4).
// Envuelve el contenido con:
//   - Sidebar a la izquierda (siempre abierto en escritorio, colapsable con hamburguesa,
//     overlay en movil)
//   - Header arriba con: hamburguesa + titulo de la pagina + campanita + perfil del usuario
//   - Contenido principal en el espacio restante
//   - Footer abajo
//
// Para que cada pagina admin use este layout, simplemente envuelve su return:
//   <AdminLayout titulo="Mi pagina">
//     <div>contenido aqui</div>
//   </AdminLayout>

import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth.js";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import Campanita from "./Campanita.jsx";
import Footer from "../Footer/Footer.jsx";
import "./AdminLayout.css";

// Clave de localStorage para recordar si el sidebar quedo colapsado/expandido
// en escritorio (en movil no se persiste, siempre arranca cerrado).
const STORAGE_KEY = "flota_sena__sidebar_colapsado";

// Detecta si la pantalla es chica (movil/tablet). El punto de corte tiene que
// coincidir con el media query del CSS.
const esMovil = () => window.innerWidth <= 900;

function AdminLayout({ titulo, children }) {
    const { usuario, cerrarSesion } = useAuth();
    const navigate = useNavigate();

    // sidebarAbierto:
    //   - Escritorio: arranca abierto, salvo que el usuario haya colapsado antes
    //   - Movil: siempre arranca cerrado
    const [sidebarAbierto, setSidebarAbierto] = useState(() => {
        if (typeof window === "undefined") return true;
        if (esMovil()) return false;
        return localStorage.getItem(STORAGE_KEY) !== "true";
    });

    // Si el usuario cambia el tamaño de la ventana (rota el celular, etc),
    // recalcular el estado por defecto.
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
            // Solo persistir en escritorio (el movil siempre arranca cerrado)
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

    return (
        <div className={`admin-layout ${sidebarAbierto ? "sidebar-abierto" : "sidebar-cerrado"}`}>
            {/* Sidebar a la izquierda */}
            <Sidebar
                abierto={sidebarAbierto}
                onCerrar={() => setSidebarAbierto(false)}
                usuario={usuario}
                onLogout={cerrar}
            />

            {/* Backdrop en movil cuando el sidebar esta abierto */}
            {sidebarAbierto && (
                <div
                    className="admin-layout-backdrop"
                    onClick={() => setSidebarAbierto(false)}
                    aria-hidden="true"
                />
            )}

            {/* Area principal: header + contenido + footer */}
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
                        {/* La campanita maneja su propio estado global (polling cada 30s).
                            Por eso ya no necesita prop tieneNotificaciones — funciona igual
                            en todas las paginas del admin, no solo en dashboard. */}
                        <Campanita />
                        {/* Bloque del usuario es un boton: clic lleva a "Mi perfil" */}
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
                            <div className="admin-layout-perfil-rol">{usuario.rol}</div>
                        </button>
                    </div>
                </header>

                <main className="admin-layout-contenido">{children}</main>

                <Footer />
            </div>
        </div>
    );
}

export default AdminLayout;
