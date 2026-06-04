import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import Footer from "../../components/Footer/Footer.jsx";
import "./ConductorDashboard.css";

function ConductorDashboard() {
    const { usuario, cerrarSesion } = useAuth();
    const navigate = useNavigate();

    const cerrar = () => {
        cerrarSesion();
        navigate("/login");
    };

    const primerNombre = usuario?.nombre_completo?.split(" ")[0] || "Conductor";

    return (
        <div className="cond-dashboard">
            <header className="cond-dashboard-header">
                <div className="cond-dashboard-logo-wrap">
                    <img src="/logoverde.png" alt="SENA" className="cond-dashboard-logo" />
                    <div className="cond-dashboard-titulo-app">Gestión de Flota</div>
                </div>
                <button className="cond-dashboard-cerrar" onClick={cerrar}>
                    Cerrar sesión
                </button>
            </header>

            <main className="cond-dashboard-main">
                <section className="cond-dashboard-saludo">
                    <div className="cond-dashboard-saludo-hola">Hola,</div>
                    <h1 className="cond-dashboard-saludo-nombre">{primerNombre}</h1>
                    <p className="cond-dashboard-saludo-rol">Conductor SENA</p>
                </section>

                <section className="cond-dashboard-circulos">
                    <button
                        className="cond-dashboard-circulo cond-dashboard-circulo-pre"
                        onClick={() => navigate("/conductor/chequeo/aptitud?tipo=preoperacional")}
                    >
                        <div className="cond-dashboard-circulo-icono">🚛</div>
                        <div className="cond-dashboard-circulo-titulo">Preoperacional</div>
                        <div className="cond-dashboard-circulo-sub">Antes del recorrido</div>
                    </button>

                    <button
                        className="cond-dashboard-circulo cond-dashboard-circulo-post"
                        onClick={() => navigate("/conductor/chequeo/aptitud?tipo=postoperacional")}
                    >
                        <div className="cond-dashboard-circulo-icono">🏁</div>
                        <div className="cond-dashboard-circulo-titulo">Post-operacional</div>
                        <div className="cond-dashboard-circulo-sub">Al regresar</div>
                    </button>
                </section>

            </main>

            <Footer />
        </div>
    );
}

export default ConductorDashboard;
