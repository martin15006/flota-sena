import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import './Dashboard.css';
import Footer from "../../components/Footer/Footer.jsx";

const ROLES_ADMIN = ['admin', 'admin_centro', 'admin_ciudad', 'admin_departamental', 'admin_regional', 'superadmin'];

function Dashboard() {
    const { usuario, cerrarSesion } = useAuth();
    const navigate = useNavigate();

    const esAdmin = ROLES_ADMIN.includes(usuario?.rol);

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
                    {esAdmin && (
                        <div className="dashboard-acciones">
                            <button
                                className="boton boton-primario"
                                onClick={() => navigate('/admin/vehiculos')}
                            >
                                Gestión de vehículos
                            </button>
                            <button
                                className="boton boton-secundario"
                                onClick={() => navigate('/admin/usuarios')}
                            >
                                Gestión de usuarios
                            </button>
                            <button
                                className="boton boton-secundario"
                                onClick={() => navigate('/admin/catalogo')}
                            >
                                Catálogo del chequeo
                            </button>
                            <button
                                className="boton boton-primario"
                                onClick={() => navigate('/admin/chequeos')}
                            >
                                Chequeos realizados
                            </button>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}

export default Dashboard;