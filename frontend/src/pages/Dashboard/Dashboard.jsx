import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import './Dashboard.css';

function Dashboard() {
    const { usuario, cerrarSesion } = useAuth();
    const navigate = useNavigate();

    if (!usuario) {
        return <Navigate to='/login' replace />;
    }

    const manejarLogout = () => {
        cerrarSesion();
        navigate('/login');
    };

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="dashboard-titulo">SENA · Gestión de Flotas</div>
                <div className="dashboard-usuario">
                    <div className="dashboard-usuario-info">
                        <div className="dashboard-usuario-nombre">
                            {usuario.nombre_completo}
                        </div>
                        <div className="dashboard-usuario-rol">{usuario.rol}</div>
                    </div>
                    <button className="dashboard-logout" onClick={manejarLogout}>
                        Cerrar sesión
                    </button>
                </div>
            </header>

            <main className="dashboard-main">
                <div className="dashboard-bienvenida animar-fade-in-up">
                    <h1>Bienvenido, {usuario.nombre_completo?.split(' ')[0]}</h1>
                    <p>
                        Sesión iniciada correctamente como {' '}
                        <strong>{usuario.rol}</strong>
                    </p>
                </div>
            </main>
        </div>
    );
}

export default Dashboard;