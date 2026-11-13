export const RANGO_ROL = {
    superadmin: 3,
    admin_departamental: 2,
    admin_centro: 1,
    admin: 1,
    conductor: 0,
};

export const ETIQUETA_ROL = {
    superadmin: 'Director Nacional',
    admin_departamental: 'Director Regional',
    admin_centro: 'Coordinador de Flota',
    admin: 'Coordinador de Flota',
    conductor: 'Conductor',
};

export const rangoDe = (rol) => {
    const r = RANGO_ROL[rol];
    return r === undefined ? -1 : r;
};

export const puedeGestionarRol = (rolActor, rolObjetivo) => {
    return rangoDe(rolActor) > rangoDe(rolObjetivo);
};

export const puedeCrearRol = (rolActor, rolNuevo) => {
    if (rolActor === 'superadmin' && rolNuevo === 'superadmin') return true;
    return rangoDe(rolActor) > rangoDe(rolNuevo);
};

export const rolesQuePuedeCrear = (rolActor) => {
    const nivel = rangoDe(rolActor);
    const canonicos = [
        'admin_departamental',
        'admin_centro',
        'conductor',
    ];
    const inferiores = canonicos.filter((rol) => rangoDe(rol) < nivel);
    if (rolActor === 'superadmin') return ['superadmin', ...inferiores];
    return inferiores;
};

export const rolEfectivo = (usuario) => {
    if (
        usuario?.rol === 'conductor' &&
        usuario?.es_pool === true &&
        usuario?.suplencia
    ) {
        return 'admin_centro';
    }
    return usuario?.rol;
};
