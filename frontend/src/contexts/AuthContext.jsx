import { createContext, useState, useEffect } from "react";
import { api } from "../lib/api.js";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [usuario, setUsuario] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [sesionExpirada, setSesionExpirada] = useState(false);

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
        const onExpirado = () => {
            localStorage.removeItem('token');
            setUsuario(null);
            setSesionExpirada(true);
        };
        window.addEventListener('auth:expirado', onExpirado);
        return () => window.removeEventListener('auth:expirado', onExpirado);
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
        setUsuario(null);
    };

    const consumirSesionExpirada = () => setSesionExpirada(false);

    return (
        <AuthContext.Provider
            value={{
                usuario,
                cargando,
                sesionExpirada,
                iniciarSesion,
                cerrarSesion,
                consumirSesionExpirada,
            }}>
            {children}
        </AuthContext.Provider>
    );
};
