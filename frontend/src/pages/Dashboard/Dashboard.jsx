// Dashboard administrativo — version final con datos reales (Bloque B paso 4).
// Consume /api/dashboard/stats y muestra:
//   1) Saludo + fecha de hoy
//   2) 4 cajas grandes de KPIs del dia
//   3) Seccion "Necesita atencion" con 3 grupos de alertas linkeables
//
// Auto-refresh cada 60 segundos para que el admin vea los numeros del dia
// actualizados sin tener que recargar manualmente.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { api } from "../../lib/api.js";
import AdminLayout from "../../components/AdminLayout/AdminLayout.jsx";
import Toast from "../../components/Toast/Toast.jsx";
import ModalInformeSuperior from "./ModalInformeSuperior.jsx";
import "./Dashboard.css";

// Helper: formato de fecha tipo "viernes 5 de junio de 2026"
const formatearFechaHoy = () => {
    const ahora = new Date();
    return ahora.toLocaleDateString("es-CO", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });
};

// Helper: clasifica los dias restantes en niveles de urgencia.
// Umbrales acordados con el usuario: <=15 dias = critico (rojo), <=30 dias = urgente (naranja)
const nivelLicencia = (dias) => {
    if (dias < 0) return "vencido";   // ya vencio (rojo invertido)
    if (dias <= 15) return "critico"; // <= 15 dias (rojo)
    if (dias <= 30) return "urgente"; // <= 30 dias (naranja)
    return "normal";                  // > 30 dias (verde)
};

// Helper: texto humano para dias restantes
const textoLicencia = (dias) => {
    if (dias < 0) return `vencida hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? "" : "s"}`;
    if (dias === 0) return "vence hoy";
    if (dias === 1) return "vence mañana";
    return `vence en ${dias} días`;
};

function Dashboard() {
    const { usuario } = useAuth();
    const navigate = useNavigate();

    const [stats, setStats] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [modalInforme, setModalInforme] = useState(false);
    const [toast, setToast] = useState(null);

    const cargarStats = async () => {
        try {
            const data = await api("/dashboard/stats");
            setStats(data);
            setError(null);
        } catch (err) {
            if (!err.sesionExpirada) setError(err.message);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        if (usuario) cargarStats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [usuario]);

    // Auto-refresh cada 60s para mantener los numeros del dia actualizados
    useEffect(() => {
        if (!usuario) return;
        const interval = setInterval(cargarStats, 60000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [usuario]);

    if (!usuario) return null;

    // Conteo total de alertas para mostrar al usuario en el header de la seccion.
    // chequeos_abandonados puede no venir en backends viejos -> uso optional chaining.
    const totalAlertas = stats
        ? stats.alertas.licencias_por_vencer.length +
          stats.alertas.vehiculos_sin_runt.length +
          stats.alertas.vehiculos_no_operativos.length +
          (stats.alertas.chequeos_abandonados?.length || 0)
        : 0;

    // Flag de scope para mostrar texto contextual al admin.
    // 'global' = superadmin (ve todo); cualquier otro = ve su area asignada.
    const esScopeLimitado = stats?.scope && stats.scope.tipo !== "global";

    return (
        <AdminLayout titulo="Dashboard">
            {/* ===== Saludo ===== */}
            <div className="dashboard-bienvenida animar-fade-in-up">
                <div>
                    <h2 className="dashboard-saludo">
                        Hola, {usuario.nombre_completo?.split(" ")[0]}
                    </h2>
                    <p className="dashboard-fecha">{formatearFechaHoy()}</p>
                    {esScopeLimitado && (
                        <p className="dashboard-scope">
                            Estás viendo los datos de tu área asignada.
                        </p>
                    )}
                </div>
                {/* El Nacional no tiene superior a quién escalar -> no se le muestra */}
                {usuario.rol !== "superadmin" && (
                    <button
                        className="dashboard-boton-informe"
                        onClick={() => setModalInforme(true)}
                        title="Enviar un informe a tu superior"
                    >
                        📤 Informar a mi superior
                    </button>
                )}
            </div>

            {/* ===== Estado de error ===== */}
            {error && (
                <div className="dashboard-error animar-shake">
                    ⚠️ {error}
                    <button className="dashboard-error-reintentar" onClick={cargarStats}>
                        Reintentar
                    </button>
                </div>
            )}

            {/* ===== KPIs del dia ===== */}
            <section className="dashboard-seccion animar-fade-in">
                <h3 className="dashboard-seccion-titulo">Números de hoy</h3>
                <div className="dashboard-kpis">
                    <div
                        className="dashboard-kpi dashboard-kpi-clickeable"
                        onClick={() => navigate("/admin/chequeos")}
                        title="Ir a chequeos realizados"
                    >
                        <div className="dashboard-kpi-numero">
                            {cargando ? "—" : stats?.kpis.chequeos_del_dia ?? 0}
                        </div>
                        <div className="dashboard-kpi-label">Chequeos del día</div>
                    </div>

                    <div
                        className={`dashboard-kpi dashboard-kpi-clickeable ${
                            !cargando && stats?.kpis.chequeos_no_operativos_del_dia > 0
                                ? "dashboard-kpi-alerta"
                                : ""
                        }`}
                        onClick={() => navigate("/admin/chequeos")}
                        title="Ver chequeos con resultado no operativo"
                    >
                        <div className="dashboard-kpi-numero">
                            {cargando ? "—" : stats?.kpis.chequeos_no_operativos_del_dia ?? 0}
                        </div>
                        <div className="dashboard-kpi-label">No operativos</div>
                    </div>

                    <div
                        className={`dashboard-kpi dashboard-kpi-clickeable ${
                            !cargando && stats?.kpis.intentos_bloqueados_del_dia > 0
                                ? "dashboard-kpi-alerta"
                                : ""
                        }`}
                        onClick={() => navigate("/admin/chequeos/intentos-bloqueados")}
                        title="Ver intentos bloqueados"
                    >
                        <div className="dashboard-kpi-numero">
                            {cargando ? "—" : stats?.kpis.intentos_bloqueados_del_dia ?? 0}
                        </div>
                        <div className="dashboard-kpi-label">Intentos bloqueados</div>
                    </div>

                    <div
                        className="dashboard-kpi dashboard-kpi-clickeable"
                        onClick={() => navigate("/admin/usuarios")}
                        title="Ir a gestión de usuarios"
                    >
                        <div className="dashboard-kpi-numero">
                            {cargando ? "—" : stats?.kpis.conductores_activos ?? 0}
                        </div>
                        <div className="dashboard-kpi-label">Conductores activos</div>
                    </div>
                </div>
            </section>

            {/* ===== Necesita atencion ===== */}
            <section className="dashboard-seccion animar-fade-in">
                <h3 className="dashboard-seccion-titulo">
                    Necesita atención
                    {totalAlertas > 0 && (
                        <span className="dashboard-seccion-badge">{totalAlertas}</span>
                    )}
                </h3>

                {cargando && (
                    <div className="dashboard-cargando">Cargando alertas...</div>
                )}

                {!cargando && totalAlertas === 0 && (
                    <div className="dashboard-sin-alertas">
                        Todo está en orden. No hay nada que requiera atención inmediata.
                    </div>
                )}

                {!cargando && totalAlertas > 0 && (
                    <div className="dashboard-alertas">
                        {/* === Licencias por vencer === */}
                        {stats.alertas.licencias_por_vencer.length > 0 && (
                            <div className="dashboard-grupo-alerta">
                                <div className="dashboard-grupo-titulo">
                                    Licencias por vencer
                                    <span className="dashboard-grupo-cantidad">
                                        {stats.alertas.licencias_por_vencer.length}
                                    </span>
                                </div>
                                <ul className="dashboard-lista-alerta">
                                    {stats.alertas.licencias_por_vencer.slice(0, 5).map((u) => {
                                        const nivel = nivelLicencia(u.dias_restantes);
                                        return (
                                            <li
                                                key={u.id}
                                                className={`dashboard-item-alerta dashboard-item-${nivel}`}
                                                onClick={() => navigate(`/admin/usuarios/${u.id}`)}
                                                title="Ver perfil del conductor"
                                            >
                                                <span className="dashboard-item-nombre">
                                                    {u.nombre_completo}
                                                </span>
                                                <span className="dashboard-item-meta">
                                                    {textoLicencia(u.dias_restantes)}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                                {stats.alertas.licencias_por_vencer.length > 5 && (
                                    <button
                                        className="dashboard-ver-mas"
                                        onClick={() => navigate("/admin/usuarios")}
                                    >
                                        Ver los {stats.alertas.licencias_por_vencer.length - 5} restantes →
                                    </button>
                                )}
                            </div>
                        )}

                        {/* === Vehiculos sin RUNT === */}
                        {stats.alertas.vehiculos_sin_runt.length > 0 && (
                            <div className="dashboard-grupo-alerta">
                                <div className="dashboard-grupo-titulo">
                                    Vehículos sin RUNT cargado
                                    <span className="dashboard-grupo-cantidad">
                                        {stats.alertas.vehiculos_sin_runt.length}
                                    </span>
                                </div>
                                <ul className="dashboard-lista-alerta">
                                    {stats.alertas.vehiculos_sin_runt.slice(0, 5).map((v) => (
                                        <li
                                            key={v.id}
                                            className="dashboard-item-alerta dashboard-item-urgente"
                                            onClick={() => navigate(`/admin/vehiculos/${v.id}`)}
                                            title="Ver detalle del vehículo"
                                        >
                                            <span className="dashboard-item-nombre">{v.placa}</span>
                                            <span className="dashboard-item-meta">
                                                {v.marca}
                                                {v.linea ? ` ${v.linea}` : ""}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                {stats.alertas.vehiculos_sin_runt.length > 5 && (
                                    <button
                                        className="dashboard-ver-mas"
                                        onClick={() => navigate("/admin/vehiculos")}
                                    >
                                        Ver los {stats.alertas.vehiculos_sin_runt.length - 5} restantes →
                                    </button>
                                )}
                            </div>
                        )}

                        {/* === Chequeos abandonados hoy (Tarea #104) === */}
                        {stats.alertas.chequeos_abandonados?.length > 0 && (
                            <div className="dashboard-grupo-alerta">
                                <div className="dashboard-grupo-titulo">
                                    Chequeos abandonados hoy
                                    <span className="dashboard-grupo-cantidad">
                                        {stats.alertas.chequeos_abandonados.length}
                                    </span>
                                </div>
                                <ul className="dashboard-lista-alerta">
                                    {stats.alertas.chequeos_abandonados.slice(0, 5).map((c) => (
                                        <li
                                            key={c.id}
                                            className="dashboard-item-alerta dashboard-item-critico"
                                            onClick={() => navigate(`/admin/chequeos/${c.id}`)}
                                            title="Ver detalle del chequeo abandonado"
                                        >
                                            <span className="dashboard-item-nombre">
                                                {c.conductor_nombre}
                                            </span>
                                            <span className="dashboard-item-meta">
                                                {c.placa} · {c.motivo_abandono || "abandonado"}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                {stats.alertas.chequeos_abandonados.length > 5 && (
                                    <button
                                        className="dashboard-ver-mas"
                                        onClick={() => navigate("/admin/chequeos")}
                                    >
                                        Ver los {stats.alertas.chequeos_abandonados.length - 5} restantes →
                                    </button>
                                )}
                            </div>
                        )}

                        {/* === Vehiculos no operativos o bloqueados === */}
                        {stats.alertas.vehiculos_no_operativos.length > 0 && (
                            <div className="dashboard-grupo-alerta">
                                <div className="dashboard-grupo-titulo">
                                    Vehículos no operativos o bloqueados
                                    <span className="dashboard-grupo-cantidad">
                                        {stats.alertas.vehiculos_no_operativos.length}
                                    </span>
                                </div>
                                <ul className="dashboard-lista-alerta">
                                    {stats.alertas.vehiculos_no_operativos.slice(0, 5).map((v) => (
                                        <li
                                            key={v.id}
                                            className="dashboard-item-alerta dashboard-item-critico"
                                            onClick={() => navigate(`/admin/vehiculos/${v.id}`)}
                                            title="Ver detalle del vehículo"
                                        >
                                            <span className="dashboard-item-nombre">{v.placa}</span>
                                            <span className="dashboard-item-meta">
                                                {!v.activo
                                                    ? "desactivado"
                                                    : v.estado === "no_operativo"
                                                        ? "no operativo"
                                                        : v.estado}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                {stats.alertas.vehiculos_no_operativos.length > 5 && (
                                    <button
                                        className="dashboard-ver-mas"
                                        onClick={() => navigate("/admin/vehiculos")}
                                    >
                                        Ver los {stats.alertas.vehiculos_no_operativos.length - 5} restantes →
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </section>

            <ModalInformeSuperior
                abierto={modalInforme}
                onCerrar={() => setModalInforme(false)}
                onEnviado={(msg) => setToast({ mensaje: msg, tipo: "exito" })}
            />
            {toast && (
                <Toast
                    mensaje={toast.mensaje}
                    tipo={toast.tipo}
                    duracion={4000}
                    posicion="arriba-centro"
                    onCerrar={() => setToast(null)}
                />
            )}
        </AdminLayout>
    );
}

export default Dashboard;
