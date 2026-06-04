# Mapa del código del Sistema de Gestión de Flota

Esta es una **guía rápida** para que cualquier persona (programador o no) sepa dónde está cada cosa del proyecto sin tener que abrir y leer archivos al azar.

> **Si eres nuevo en el proyecto, lee primero este archivo.**

---

## 1. Recursos visuales (logos, imágenes, íconos)

| Quiero cambiar... | Dónde está | Cómo se cambia |
|---|---|---|
| El logo verde del SENA | `frontend/public/logoverde.png` | Reemplazar el archivo PNG con el mismo nombre |
| El logo naranja del SENA | `frontend/public/logonaranja.png` | Reemplazar el archivo PNG |
| El escudo del SENA | `frontend/public/escudo.png` | Reemplazar el archivo PNG |
| El logo de SENNOVA | `frontend/public/sennova.png` | Reemplazar el archivo PNG |
| El logo de ICI | `frontend/public/ici.png` | Reemplazar el archivo PNG |
| Los íconos 🚛 y 🏁 del dashboard | `frontend/src/pages/Conductor/ConductorDashboard.jsx` | Son emojis Unicode escritos en el JSX. Buscar y reemplazar el emoji |
| Los íconos de categorías del chequeo (Niveles, Pedales, etc.) | Base de datos, tabla `categorias_chequeo`, columna `icono` | Ver sección 3 (catálogo del chequeo) |

---

## 2. Colores, tipografías, espaciados (diseño global)

Todo el diseño está centralizado en **un solo archivo de variables CSS**:

```
frontend/src/styles/variables.css
```

Allí están todos los colores (verde SENA, naranja, rojo, etc.), tamaños de texto, espacios y sombras. Si quieres cambiar el verde del sistema, lo haces ahí una vez y se actualiza en todas las páginas.

Cada componente tiene su propio archivo CSS al lado del JSX. Ejemplo:

```
frontend/src/pages/Login/
├── Login.jsx       (la lógica y la estructura)
└── Login.css       (los estilos solo de esta pantalla)
```

**No usamos Tailwind.** Todo es CSS modular.

---

## 3. Catálogo del chequeo preoperacional (preguntas, ítems, categorías)

Este es el contenido del chequeo que hace el conductor. Está en **base de datos** porque queremos que el SENA pueda ajustarlo sin necesitar al desarrollador.

### Dónde está la fuente de verdad inicial

| Quiero cambiar... | Archivo SQL en Git |
|---|---|
| Las 5 categorías y sus íconos | `database/seeds/01_categorias_chequeo.sql` |
| Los 39 ítems del chequeo (y cuáles son críticos) | `database/seeds/02_items_chequeo.sql` |
| Las 5 preguntas de aptitud del conductor | `database/seeds/03_preguntas_aptitud.sql` |
| Las regiones de Colombia | `database/seeds/04_regiones.sql` |
| Los departamentos de Colombia | `database/seeds/05_departamentos.sql` |

### Cómo se cambia algo (la forma fácil) ✅

**Entra como admin al sistema → Dashboard → "Catálogo del chequeo"** (`/admin/catalogo`).

Allí tienes 3 pestañas:
- **Categorías**: crear, editar (incluyendo cambiar el ícono visual), desactivar.
- **Ítems del checklist**: crear, editar (incluyendo marcar/desmarcar como críticos), desactivar. Agrupados por categoría.
- **Preguntas de aptitud**: crear, editar, desactivar.

Los cambios se reflejan **inmediatamente** en la app del conductor. No necesitas saber SQL ni tocar código.

> Si por algún motivo quieres editar directamente la BD (avanzado), las tablas son `categorias_chequeo`, `items_chequeo`, `preguntas_aptitud`. Los archivos JSX de la pantalla admin son:
> - `frontend/src/pages/CatalogoAdmin/CatalogoAdmin.jsx`
> - `backend/src/services/catalogoAdmin.service.js`
> - `backend/src/controllers/catalogoAdmin.controller.js`
> - `backend/src/routes/catalogoAdmin.routes.js`

### Por qué los textos no están hardcodeados en los JSX del conductor

Si las preguntas estuvieran escritas directamente en `ChequeoAptitud.jsx`, cualquier cambio requeriría: editar código → commit → push → redeploy. Como están en BD y editables desde el admin, el SENA puede ajustar el chequeo en vivo sin pasar por desarrollo. El archivo JSX solo dibuja la pantalla; el contenido viene de la BD.

---

## 4. Datos de prueba (usuarios, vehículos)

| Quiero cambiar... | Cómo |
|---|---|
| El primer usuario admin | Se crea manualmente al iniciar el proyecto. Las instrucciones están en `docs/CONTEXTO_PROYECTO.md` |
| Los vehículos de prueba | Por la interfaz: entra como admin → Gestión de vehículos → Crear vehículo |
| Los conductores de prueba | Por la interfaz: entra como admin → Gestión de usuarios → Crear usuario (rol: Conductor) |

---

## 5. Lógica del negocio (¿cómo se calcula el estado del vehículo?)

Toda la lógica de cálculo del chequeo (qué estado le da al vehículo, cuándo bloquea, etc.) está en:

```
backend/src/services/chequeos.service.js
```

Funciones clave:
- `evaluarAptitud()` — decide si el conductor está apto.
- `calcularResultado()` — calcula el estado final del vehículo (operativo / observación / alerta / crítico / no operativo).
- `cerrarChequeo()` — cierra el chequeo y actualiza el vehículo si corresponde.

Las reglas de negocio están explicadas en `docs/CONTEXTO_PROYECTO.md` sección 9.

---

## 6. Páginas del frontend (dónde está cada pantalla)

### Pantallas comunes (login)

| Pantalla | Archivo |
|---|---|
| Inicio de sesión | `frontend/src/pages/Login/Login.jsx` |
| Cambio obligatorio de contraseña | `frontend/src/pages/CambiarPassword/CambiarPassword.jsx` |

### Pantallas del admin

| Pantalla | Archivo |
|---|---|
| Dashboard del admin | `frontend/src/pages/Dashboard/Dashboard.jsx` |
| Gestión de usuarios | `frontend/src/pages/UsuariosAdmin/UsuariosAdmin.jsx` |
| Gestión de vehículos | `frontend/src/pages/VehiculosAdmin/VehiculosAdmin.jsx` |
| Detalle de un vehículo | `frontend/src/pages/VehiculoDetalle/VehiculoDetalle.jsx` |
| **Catálogo del chequeo** (preguntas, ítems, categorías) | `frontend/src/pages/CatalogoAdmin/CatalogoAdmin.jsx` |

### Pantallas del conductor

| Pantalla | Archivo |
|---|---|
| Dashboard del conductor | `frontend/src/pages/Conductor/ConductorDashboard.jsx` |
| Aptitud (5 preguntas) | `frontend/src/pages/Conductor/ChequeoAptitud.jsx` |
| Selección de vehículo | `frontend/src/pages/Conductor/SeleccionVehiculo.jsx` |
| Checklist (5 categorías) | `frontend/src/pages/Conductor/ChequeoItems.jsx` |
| Resultado final | `frontend/src/pages/Conductor/ChequeoResultado.jsx` |

---

## 7. Endpoints del backend

Todos los endpoints están agrupados por entidad en `backend/src/routes/`:

| Archivo | Endpoints |
|---|---|
| `auth.routes.js` | Login, cambio de contraseña, perfil |
| `usuarios.routes.js` | CRUD de usuarios (admin) |
| `vehiculos.routes.js` | CRUD de vehículos + fotos + RUNT |
| `geo.routes.js` | Regiones, departamentos, ciudades, centros |
| `chequeos.routes.js` | Catálogo + flujo del chequeo + vista del admin |

La lógica de cada uno está en `backend/src/controllers/` y `backend/src/services/`.

---

## 8. Documentación adicional

| Archivo | Para qué sirve |
|---|---|
| `docs/CONTEXTO_PROYECTO.md` | Toda la información de dominio: roles, reglas de negocio, decisiones tomadas |
| `docs/MANUAL_DE_USO.md` | Manual de usuario final (se entregará al SENA) |
| `docs/MAPA_DEL_CODIGO.md` | **Este archivo** — guía rápida para desarrolladores nuevos |
| `docs/bitacora/bitacora.docx` | Bitácora semanal del proyecto SENNOVA |
