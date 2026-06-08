// Dashboard del conductor — rediseñado en Tarea #103 con el ConductorLayout.
// Estructura:
//   1) Hero: foto del conductor + saludo + fecha + rol
//   2) Los 2 circulos centrales (Preoperacional + Post-operacional) intactos
//   3) Card con info de licencia (categoria, numero, vencimiento)
//
// Cualquier cambio en el layout general (header/footer) vive en ConductorLayout.

import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import ConductorLayout from "../../components/ConductorLayout/ConductorLayout.jsx";
import "./ConductorDashboard.css";

// Helper: fecha tipo "viernes 5 de junio de 2026"
const formatearFechaHoy = () => {
    const ahora = new Date();
    return ahora.toLocaleDateString("es-CO", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });
};

// Helper: texto humano para "tiempo hasta el vencimiento" de la licencia.
// Umbrales: <0=vencido, <=15=critico (rojo), <=30=urgente (naranja), >30=normal (verde).
const tiempoHasta = (iso) => {
    if (!iso) return null;
    const ahora = new Date();
    const objetivo = new Date(iso);
    const diffMs = objetivo - ahora;
    const dias = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (dias < 0) return { texto: `vencida hace ${Math.abs(dias)} días`, nivel: "vencido" };
    if (dias === 0) return { texto: "vence hoy", nivel: "critico" };
    if (dias <= 15) return { texto: `${dias} día${dias === 1 ? "" : "s"}`, nivel: "critico" };
    if (dias <= 30) return { texto: `${dias} día${dias === 1 ? "" : "s"}`, nivel: "urgente" };
    if (dias <= 365) {
        const meses = Math.round(dias / 30);
        return { texto: `${meses} ${meses === 1 ? "mes" : "meses"}`, nivel: "normal" };
    }
    const anios = Math.floor(dias / 365);
    return { texto: `${anios} ${anios === 1 ? "año" : "años"}`, nivel: "normal" };
};

function ConductorDashboard() {
    const { usuario } = useAuth();
    const navigate = useNavigate();

    if (!usuario) return null;

    const primerNombre = usuario.nombre_completo?.split(" ")[0] || "Conductor";
    const vencimiento = tiempoHasta(usuario.licencia_vencimiento);
    // Inicial del nombre para el placeholder cuando no hay foto
    const inicial = usuario.nombre_completo?.charAt(0).toUpperCase() || "C";

    return (
        <ConductorLayout>
            {/* Contenedor principal que agrupa hero + circulos + licencia
                en un solo "card" visual grande. */}
            <div className="cond-contenedor animar-fade-in-up">

            {/* ===== Hero: foto + saludo + fecha ===== */}
            <section className="cond-hero">
                {usuario.foto_url ? (
                    <img
                        src={usuario.foto_url}
                        alt={usuario.nombre_completo}
                        className="cond-hero-foto"
                    />
                ) : (
                    <div className="cond-hero-foto-placeholder">{inicial}</div>
                )}
                <div className="cond-hero-saludo">Hola,</div>
                <h1 className="cond-hero-nombre">{primerNombre}</h1>
                <div className="cond-hero-rol">Conductor SENA</div>
                {usuario.centro_nombre && (
                    <div className="cond-hero-centro">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                        >
                            <path d="M3 21h18" />
                            <path d="M5 21V7l8-4v18" />
                            <path d="M19 21V11l-6-4" />
                            <line x1="9" y1="9" x2="9" y2="9.01" />
                            <line x1="9" y1="12" x2="9" y2="12.01" />
                            <line x1="9" y1="15" x2="9" y2="15.01" />
                            <line x1="9" y1="18" x2="9" y2="18.01" />
                        </svg>
                        <span>{usuario.centro_nombre}</span>
                    </div>
                )}
                <div className="cond-hero-fecha">{formatearFechaHoy()}</div>
            </section>

            {/* ===== Los 2 circulos al centro ===== */}
            <section className="cond-circulos">
                <button
                    className="cond-circulo cond-circulo-pre"
                    onClick={() => navigate("/conductor/chequeo/aptitud?tipo=preoperacional")}
                    title="Iniciar chequeo preoperacional"
                >
                    <div className="cond-circulo-icono">🚛</div>
                    <div className="cond-circulo-titulo">Preoperacional</div>
                    <div className="cond-circulo-sub">Antes del recorrido</div>
                </button>

                <button
                    className="cond-circulo cond-circulo-post"
                    onClick={() => navigate("/conductor/chequeo/aptitud?tipo=postoperacional")}
                    title="Iniciar chequeo postoperacional"
                >
                    <div className="cond-circulo-icono">🏁</div>
                    <div className="cond-circulo-titulo">Post-operacional</div>
                    <div className="cond-circulo-sub">Al regresar</div>
                </button>
            </section>

            {/* ===== Card con info de licencia ===== */}
            {(usuario.licencia_numero || usuario.licencia_categoria || usuario.licencia_vencimiento) && (
                <section className="cond-licencia">
                    <div className="cond-licencia-encabezado">
                        <span className="cond-licencia-titulo">Mi licencia de conducción</span>
                    </div>
                    <div className="cond-licencia-grid">
                        {usuario.licencia_categoria && (
                            <div className="cond-licencia-campo">
                                <div className="cond-licencia-label">Categoría</div>
                                <div className="cond-licencia-valor">
                                    {usuario.licencia_categoria}
                                </div>
                            </div>
                        )}
                        {usuario.licencia_numero && (
                            <div className="cond-licencia-campo">
                                <div className="cond-licencia-label">Número</div>
                                <div className="cond-licencia-valor">
                                    {usuario.licencia_numero}
                                </div>
                            </div>
                        )}
                        {vencimiento && (
                            <div className="cond-licencia-campo">
                                <div className="cond-licencia-label">Vencimiento</div>
                                <div
                                    className={`cond-licencia-vencimiento cond-licencia-vencimiento-${vencimiento.nivel}`}
                                >
                                    {vencimiento.texto}
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            )}

            </div>
        </ConductorLayout>
    );
}

export default ConductorDashboard;
