export const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001/api`;

export const api = async (endpoint, options = {}) => {
    const token = localStorage.getItem('token');
    const centroActivo = localStorage.getItem('flota_centro_activo');

    const headers = {
        'Content-type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(centroActivo && { 'X-Centro-Activo': centroActivo }),
        ...options.headers,
    };

    const config = {
        ...options,
        headers,
        cache: 'no-store',
        body: options.body ? JSON.stringify(options.body) : undefined,
    };

    const metodo = (options.method || 'GET').toUpperCase();
    const separador = endpoint.includes('?') ? '&' : '?';
    const urlFinal =
        metodo === 'GET'
            ? `${API_URL}${endpoint}${separador}_=${Date.now()}`
            : `${API_URL}${endpoint}`;

    let response;
    try {
        response = await fetch(urlFinal, config);
    } catch (err) {
        throw new Error('No se pudo conectar al servidor');
    }

    const data = await response.json().catch(() => ({}));

    if (response.status === 401 && endpoint !== '/auth/login') {
        window.dispatchEvent(
            new CustomEvent('auth:expirado', {
                detail: { mensaje: data.error || 'Tu sesión expiró' },
            })
        );
        const err = new Error(data.error || 'Sesión expirada');
        err.sesionExpirada = true;
        throw err;
    }

    if (
        response.status === 403 &&
        data.error === 'Cuenta desactivada' &&
        endpoint !== '/auth/login'
    ) {
        window.dispatchEvent(
            new CustomEvent('auth:desactivado', {
                detail: {
                    mensaje:
                        'Tu cuenta fue desactivada. Contacta al administrador del SENA.',
                },
            })
        );
        const err = new Error('Cuenta desactivada');
        err.cuentaDesactivada = true;
        throw err;
    }

    if (!response.ok) {
        const err = new Error(data.error || `Error ${response.status}`);
        err.status = response.status;
        throw err;
    }

    return data;
};
