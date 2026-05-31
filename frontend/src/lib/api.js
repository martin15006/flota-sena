const API_URL = 'http://localhost:3001/api';

export const api = async (endpoint, options = {}) => {
    const token = localStorage.getItem('token');

    const headers = {
        'Content-type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        ...(token && { Authorization: `Bearer ${token}` }),
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

    if (!response.ok) {
        throw new Error(data.error || `Error ${response.status}`);
    }

    return data;
};
