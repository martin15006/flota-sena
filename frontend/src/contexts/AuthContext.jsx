import { createContext, useState, useEffect } from "react";
import { api } from "../lib/api.js";
import { clearCentroActivo } from "../lib/centroActivo.js";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [usuario, setUsuario] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [sesionExpirada, setSesionExpirada] = useState(false);
    const [mensajeSalida, setMensajeSalida] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            setCargando(false);
            return;
        }

        api('/auth/me')
            .then((data) => setUsuario(data.usuario))
            .catch(() => {
                localStorage.removeItem('token');
                setUsuario(null);
            })
            .finally(() => setCargando(false));
    }, []);

    useEffect(() => {
        const onForzarSalida = (e) => {
            localStorage.removeItem('token');
            clearCentroActivo();
            setUsuario(null);
            setSesionExpirada(true);
            setMensajeSalida(e.detail?.mensaje || 'Tu sesión expiró. Vuelve a iniciar sesión.');
        };
        window.addEventListener('auth:expirado', onForzarSalida);
        window.addEventListener('auth:desactivado', onForzarSalida);
        return () => {
            window.removeEventListener('auth:expirado', onForzarSalida);
            window.removeEventListener('auth:desactivado', onForzarSalida);
        };
    }, []);

    const iniciarSesion = async (identificador, password) => {
        const data = await api('/auth/login', {
            method: 'POST',
            body: { identificador, password },
        });
        localStorage.setItem('token', data.token);
        setUsuario(data.usuario);
        setSesionExpirada(false);
        return data.usuario;
    };

    const cerrarSesion = () => {
        localStorage.removeItem('token');
        clearCentroActivo();
        setUsuario(null);
    };

    const actualizarUsuario = (nuevoUsuario) => {
        setUsuario(nuevoUsuario);
    };

    const consumirSesionExpirada = () => {
        setSesionExpirada(false);
        setMensajeSalida(null);
    };

    return (
        <AuthContext.Provider
            value={{
                usuario,
                cargando,
                sesionExpirada,
                mensajeSalida,
                iniciarSesion,
                cerrarSesion,
                actualizarUsuario,
                consumirSesionExpirada,
            }}>
            {children}
        </AuthContext.Provider>
    );
};
