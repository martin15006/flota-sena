const API_URL = 'http://localhost:3001/api';

export const api = async (endpoint, options = {}) => {
    const token = localStorage.getItem('token');

    const headers = {
        'Content-type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
    };

    const config = {
        ...options,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
    };

    let response;
    try {
        response = await fetch(`${API_URL}${endpoint}`, config);
    } catch (err) {
        throw new Error('No se pudo conectar al servidor');
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || `Error ${response.status}`);
    }

    return data;
};