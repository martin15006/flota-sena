// Pool · Suplencia Fase B (multi-centro).
// Cuando el pool cubre VARIOS centros (toda una regional), elige cuál gestiona a la vez
// (el "centro activo"). Se guarda en localStorage y el helper `api` lo manda en el header
// `X-Centro-Activo`; el backend lo valida contra los centros que cubre la suplencia y
// acota el scope a ese centro.

const KEY = "flota_centro_activo";

export const getCentroActivo = () => localStorage.getItem(KEY) || null;

export const setCentroActivo = (id) => {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
};

export const clearCentroActivo = () => localStorage.removeItem(KEY);
