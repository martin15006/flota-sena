// Usamos el hostname actual para que funcione tanto en localhost como cuando se accede
// desde un celular conectado al mismo wifi (http://<IP_DEL_PC>:5173 -> API en :3001 de la misma IP)
const API_URL = `http://${window.location.hostname}:3001/api`;

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
        // Adjuntamos el status al Error para que los callers puedan diferenciar
        // entre tipos de fallo (401, 403, 404, etc) y mostrar UI distinta.
        const err = new Error(data.error || `Error ${response.status}`);
        err.status = response.status;
        throw err;
    }

    return data;
};
