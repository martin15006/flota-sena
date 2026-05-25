import { createContext, useState, useEffect } from "react";
import { api } from "../lib/api.js";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [usuario, setUsuario] = useState(null);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            setCargando(false);
            return;
        }

        api('/auth/me')
            .then((data) => setUsuario(data.usuario))
            .catch(() => {
                localStorage.romoveItem('token');
                setUsuario(null);
            })
            .finally(() => setCargando(false));
    }, []);

    const iniciarSesion = async (identificador, password) => {
        const data = await api('/auth/login', {
            method: 'POST',
            body: { identificador, password },
        });
        localStorage.setItem('token', data.token);
        setUsuario(data.usuario);
        return data.usuario;
    };

    const cerrarSesion = () => {
        localStorage.removeItem('token');
        setUsuario(null);
    };

    return (
        <AuthContext.Provider
            value={{ usuario, cargando, iniciarSesion, cerrarSesion }}>
            {children}
        </AuthContext.Provider>
    );
};