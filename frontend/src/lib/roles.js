export const RANGO_ROL = {
    superadmin: 3,
    admin_departamental: 2,
    admin_centro: 1,
    admin: 1,
    conductor: 0,
};

export const ETIQUETA_ROL = {
    superadmin: "Director Nacional",
    admin_departamental: "Director Regional",
    admin_centro: "Coordinador de Flota",
    admin: "Coordinador de Flota",
    conductor: "Conductor",
};

export const ETIQUETA_ROL_CORTA = {
    superadmin: "Dir. Nacional",
    admin_departamental: "Dir. Regional",
    admin_centro: "Coord. Flota",
    admin: "Coord. Flota",
    conductor: "Conductor",
};

export const NIVEL_TERRITORIO = {
    admin_departamental: "departamento",
    admin_centro: "centro",
    conductor: "centro",
};

export const ROLES_ADMIN = [
    "admin",
    "admin_centro",
    "admin_departamental",
    "superadmin",
];

export const esAdmin = (rol) => ROLES_ADMIN.includes(rol);

export const esDirector = (rol) => rol === "superadmin" || rol === "admin_departamental";

export const enSuplencia = (usuario) => !!usuario?.suplencia;

export const esAdminEfectivo = (usuario) =>
    esAdmin(usuario?.rol) || enSuplencia(usuario);

export const cubreVariosCentros = (usuario) =>
    (usuario?.suplencia_centros?.length || 0) > 1;

export const necesitaElegirCentro = (usuario) =>
    enSuplencia(usuario) && cubreVariosCentros(usuario) && !usuario?.centro_activo;

export const etiquetaCargo = (usuario) => {
    if (usuario?.rol === "conductor" && usuario?.es_pool) return "Pool de transporte";
    return ETIQUETA_ROL[usuario?.rol] || usuario?.rol || "";
};
export const etiquetaCargoCorta = (usuario) => {
    if (usuario?.rol === "conductor" && usuario?.es_pool) return "Pool";
    return ETIQUETA_ROL_CORTA[usuario?.rol] || usuario?.rol || "";
};

export const rangoDe = (rol) => {
    const r = RANGO_ROL[rol];
    return r === undefined ? -1 : r;
};

export const rolesQuePuedeCrear = (rolActor) => {
    const nivel = rangoDe(rolActor);
    const canonicos = [
        "admin_departamental",
        "admin_centro",
        "conductor",
    ];
    const inferiores = canonicos.filter((rol) => rangoDe(rol) < nivel);
    if (rolActor === "superadmin") return ["superadmin", ...inferiores];
    return inferiores;
};
