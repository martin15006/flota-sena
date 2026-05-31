import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import Toast from '../../components/Toast/Toast.jsx';
import './Login.css';

function Login() {
    const [identificador, setIdentificador] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [toast, setToast] = useState(null);
    const { iniciarSesion, sesionExpirada, consumirSesionExpirada } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (sesionExpirada) {
            setToast({
                mensaje: "Tu sesión expiró. Vuelve a iniciar sesión.",
                tipo: "advertencia",
                key: Date.now(),
            });
            consumirSesionExpirada();
        }
    }, [sesionExpirada, consumirSesionExpirada]);

    const manejarSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setCargando(true);

        try {
            const usuario = await iniciarSesion(identificador, password);

            if (usuario.debe_cambiar_password) {
                navigate('/cambiar-password');
            } else {
                navigate('/dashboard');
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="login-pagina">
            <div className="login-fondo">
                <div className="login-formas"></div>
            </div>

            <div className="login-tarjeta animar-fade-in-up">
                <div className="login-cabecera">
                    <img src='/logoverde.png' alt="SENA" className="login-logo-img" />
                    <div className="login-logo-texto">SENA · Regional Tolima</div>
                    <h1 className="login-titulo">Iniciar sesión</h1>
                    <p className="login-subtitulo">Sistema de Gestión de Flota Vehicular</p>
                </div>

                <form className="login-form" onSubmit={manejarSubmit}>
                    <div className="login-campo">
                        <label htmlFor='identificador' className="login-label">
                            Correo o cédula
                        </label>
                        <input
                            id='identificador'
                            type='text'
                            className="login-input"
                            value={identificador}
                            onChange={(e) => setIdentificador(e.target.value)}
                            placeholder="ejemplo@correo.com o 1234567890"
                            required
                            autoFocus
                            disabled={cargando}
                        />
                    </div>

                    <div className="login-campo">
                        <label htmlFor="password" className="login-label">
                            Contraseña
                        </label>
                        <input
                            id='password'
                            type='password'
                            className="login-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            disabled={cargando}
                        />
                    </div>

                    {error && (
                        <div className="login-error animar-shake">
                            {error}
                        </div>
                    )}
                    <button
                        type='submit'
                        className="login-boton"
                        disabled={cargando || !identificador || !password}
                    >
                        {cargando ? (
                            <span className="login-spinner"></span>
                        ) : (
                            'Iniciar sesión'
                        )}
                    </button>
                </form>
            </div>

            {toast && (
                <Toast
                    key={toast.key}
                    mensaje={toast.mensaje}
                    tipo={toast.tipo}
                    duracion={5000}
                    onCerrar={() => setToast(null)}
                />
            )}
        </div>
    );
}

export default Login;