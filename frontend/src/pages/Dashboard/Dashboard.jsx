import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import './Dashboard.css';
import Footer from "../../components/Footer/Footer.jsx";

function Dashboard() {
    const { usuario, cerrarSesion } = useAuth();
    const navigate = useNavigate();


    const manejarLogout = () => {
        cerrarSesion();
        navigate('/login');
    };

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className='dashboard-logo-wrapper'>
                    <img src="/logoverde.png" alt='SENA' className="dashboard-logo-img" />
                    <div className="dashboard-titulo">Gestión de Flota</div>
                </div>
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
                    {usuario.rol === 'admin' && (
                        <button
                            className="boton boton-primario"
                            onClick={() => navigate('/admin/usuarios')}
                            style={{ marginTop: '24px' }}
                        >
                            Gestion de usuarios
                        </button>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}

export default Dashboard;