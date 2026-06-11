// Jerarquia de roles en el FRONTEND.
// ESPEJO de backend/src/services/jerarquia.service.js — si cambias alla, cambia aca.
//
// Sirve para que la UI muestre solo lo que el admin actual puede hacer (que roles
// puede crear, que nivel de territorio asignar). La seguridad REAL la impone el
// backend; esto es solo para no ofrecer opciones que igual serian rechazadas.

export const RANGO_ROL = {
    superadmin: 5,
    admin_regional: 4,
    admin_departamental: 3,
    admin_ciudad: 2,
    admin_centro: 1,
    admin: 1, // alias historico de admin_centro
    conductor: 0,
};

export const ETIQUETA_ROL = {
    superadmin: "Super administrador",
    admin_regional: "Administrador regional",
    admin_departamental: "Administrador departamental",
    admin_ciudad: "Administrador de ciudad",
    admin_centro: "Administrador de centro",
    admin: "Administrador de centro",
    conductor: "Conductor",
};

// Etiqueta compacta para badges/pills de tabla (espacio reducido).
export const ETIQUETA_ROL_CORTA = {
    superadmin: "Superadmin",
    admin_regional: "Adm. regional",
    admin_departamental: "Adm. deptal.",
    admin_ciudad: "Adm. ciudad",
    admin_centro: "Adm. centro",
    admin: "Admin",
    conductor: "Conductor",
};

// Que NIVEL geografico se le asigna a cada rol.
//   region / departamento / ciudad / centro  (superadmin no tiene territorio)
export const NIVEL_TERRITORIO = {
    admin_regional: "region",
    admin_departamental: "departamento",
    admin_ciudad: "ciudad",
    admin_centro: "centro",
    conductor: "centro",
};

// Todos los roles con acceso al panel administrativo (los 5 niveles + el alias
// historico 'admin'). Lo unico que NO es admin es 'conductor'.
export const ROLES_ADMIN = [
    "admin",
    "admin_centro",
    "admin_ciudad",
    "admin_departamental",
    "admin_regional",
    "superadmin",
];

// ¿Este rol es de tipo administrador (cualquier nivel)? Usar esto en vez de
// comparar contra "admin" a secas, que deja fuera a los roles multinivel.
export const esAdmin = (rol) => ROLES_ADMIN.includes(rol);

export const rangoDe = (rol) => {
    const r = RANGO_ROL[rol];
    return r === undefined ? -1 : r;
};

// Roles que el actor puede crear: todos los de rango ESTRICTAMENTE inferior.
// Excepcion (continuidad): el superadmin tambien puede nombrar OTROS superadmins
// (pero nunca eliminarlos/desactivarlos/editarlos — eso protege #112).
export const rolesQuePuedeCrear = (rolActor) => {
    const nivel = rangoDe(rolActor);
    const canonicos = [
        "admin_regional",
        "admin_departamental",
        "admin_ciudad",
        "admin_centro",
        "conductor",
    ];
    const inferiores = canonicos.filter((rol) => rangoDe(rol) < nivel);
    if (rolActor === "superadmin") return ["superadmin", ...inferiores];
    return inferiores;
};
