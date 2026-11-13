const KEY = "flota_centro_activo";

export const getCentroActivo = () => localStorage.getItem(KEY) || null;

export const setCentroActivo = (id) => {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
};

export const clearCentroActivo = () => localStorage.removeItem(KEY);
