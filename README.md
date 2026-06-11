# Sistema de Gestión de Flota Vehicular — SENA Regional Tolima

Proyecto **ID+I / SENNOVA** — Centro de Industria y Construcción.

Sistema web para el chequeo preoperacional digital de la flota institucional, con detección automática de fallas, alertas en tiempo real al coordinador y gestión preventiva de vencimientos (SOAT, RTM, extintor, licencia).

---

## 🛠️ Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite + React Router 7 + CSS modular |
| Backend | Node.js 24 + Express 5 + Multer |
| Base de datos | Supabase (PostgreSQL en la nube) |
| Autenticación | Supabase Auth + JWT + bcrypt |
| Storage de imágenes | Cloudinary (con optimización automática) |
| Tiempo real | Supabase Realtime (alertas al admin — Fase 5) |
| Correo | Nodemailer (envíos automáticos — Fase 5) |

---

## 📁 Estructura del proyecto

```
flota-sena/
├── backend/                  → API REST con Node.js + Express
│   ├── src/
│   │   ├── config/           → Conexión a Supabase, configuración
│   │   ├── routes/           → Definición de endpoints
│   │   ├── controllers/      → Lógica de cada endpoint
│   │   ├── services/         → Lógica de negocio reutilizable
│   │   ├── models/           → Acceso a datos
│   │   ├── middlewares/      → Auth, validación, errores
│   │   └── server.js         → Entry point
│   ├── .env                  → Variables sensibles (NO va a Git)
│   └── .env.example          → Plantilla del .env
│
├── frontend/                 → Aplicación React
│   ├── src/
│   │   ├── pages/            → Páginas de la app
│   │   │   ├── Login/        → Página de inicio de sesión
│   │   │   └── Dashboard/    → Panel principal post-login
│   │   ├── components/       → Componentes reutilizables
│   │   ├── contexts/         → AuthContext (estado global del usuario)
│   │   ├── hooks/            → Custom hooks (useAuth)
│   │   ├── lib/              → Helpers (api.js para llamadas al backend)
│   │   ├── styles/           → CSS global (variables, reset, global, animations)
│   │   ├── assets/           → Imágenes y recursos
│   │   ├── App.jsx           → Router principal + AuthProvider
│   │   └── main.jsx          → Entry point
│   └── package.json
│
└── docs/                     → Documentación técnica del proyecto
```

---

## 🚀 Cómo correr el proyecto en local

### Requisitos previos

- Node.js 20 o superior
- Git
- Cuenta de Supabase (gratis) con un proyecto creado
- Tablas `usuarios` y `auditoria_usuarios` creadas en Supabase (ver `docs/`)

### 1. Clonar el repositorio

```bash
git clone https://github.com/martin15006/flota-sena.git
cd flota-sena
```

### 2. Configurar el backend

```bash
cd backend
npm install
cp .env.example .env
# Editar .env con tus credenciales de Supabase
npm run dev
```

El backend queda en `http://localhost:3001`.

### 3. Configurar el frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

El frontend queda en `http://localhost:5173`.

### 4. Iniciar sesión

Abre `http://localhost:5173` — te redirige automáticamente a `/login`.

Ingresa con un usuario admin creado previamente en Supabase. Puedes usar:
- **Correo electrónico** registrado, o
- **Cédula** asociada al usuario (el sistema acepta ambos)

Después del login exitoso te lleva al panel `/dashboard`.

---

## 📋 Fases de desarrollo

| Fase | Descripción | Estado |
|------|-------------|--------|
| 0 | Fundación: estructura, frontend base, backend base, Supabase | ✅ |
| 1 | Autenticación: login, roles, gestión de usuarios | ✅ |
| 2 | Gestión de vehículos: CRUD admin, fotos, datos | ✅ |
| 3 | Flujo del conductor: aptitud + chequeo de 39 ítems | ✅ |
| 4 | Dashboard admin + navegación + notificaciones + roles multinivel | 🔄 En curso (falta Ajustes y despliegue) |
| 5 | Notificaciones: campanita en sitio + correo | ⏳ |
| 6 | Reportes: exportación Excel/PDF, envío automático | ⏳ |
| 7 | Vencimientos automáticos: SOAT, RTM, extintor, licencia | ⏳ |
| 8 | Pruebas TRL 6 → TRL 7: validación end-to-end y campo real | ⏳ |

### Detalle Fase 1 (completada)

**Backend**
- [x] Tablas `usuarios` y `auditoria_usuarios` en Supabase con triggers y constraints
- [x] Endpoints de auth: `/api/auth/login`, `/api/auth/me`, `/api/auth/cambiar-password`
- [x] Endpoints CRUD de usuarios: listar, obtener, crear, editar, desactivar, reactivar, eliminar, resetear password
- [x] Endpoint de upload de imágenes a Cloudinary
- [x] Middleware de verificación de token JWT
- [x] Middleware de rol admin para rutas privilegiadas
- [x] Validación que impide eliminar al último admin activo
- [x] Auditoría automática de todas las acciones administrativas

**Frontend**
- [x] Página de login con soporte de correo o cédula
- [x] AuthContext con persistencia de sesión en localStorage
- [x] Componente ProtectedRoute con manejo de estado de carga
- [x] Dashboard placeholder con datos del usuario y logout
- [x] Página completa de gestión de usuarios con tabla, filtros y acciones
- [x] Modal reutilizable base con cierre por ESC o botón X y bloqueo de scroll
- [x] Modal de crear usuario con upload de foto y preview
- [x] Modal de editar usuario con datos pre-llenados
- [x] Modal de contraseña temporal con copiar al portapapeles
- [x] Página de cambio obligatorio de contraseña con redirección automática
- [x] Footer institucional reutilizable con logos SENA + ICI + SENNOVA
- [x] Integración de logos institucionales en login y headers

### Detalle Fase 2 (completada)

**Base de datos**
- [x] Tabla `vehiculos` con placa, marca, modelo, año, VIN, tipo, kilometraje, fechas SOAT/RTM, estado operativo, nivel de criticidad, `centro_id`
- [x] Tabla `fotos_vehiculo` para galería múltiple (FK a vehiculos)
- [x] Tabla `auditoria_vehiculos` con todas las acciones administrativas
- [x] Estructura geográfica multinivel (Regional → Departamental → Ciudad → Centro)
- [x] Carga inicial de las 9 placas de la flota SENA Tolima

**Backend**
- [x] Endpoints CRUD de vehículos (`/api/vehiculos`) con auditoría y validación de placa única
- [x] Endpoint de upload de múltiples fotos por vehículo + marcar foto principal
- [x] Endpoint de upload del archivo RUNT en PDF
- [x] Filtrado automático de vehículos por `centro_id` del admin (multi-tenant)
- [x] Eliminación encadenada de archivos en Cloudinary al borrar vehículo o fotos
- [x] Keep-alive de conexión Supabase cada 4 minutos (parche temporal — ver Bitácora)

**Frontend**
- [x] Página de listado de vehículos con cards, filtros, búsqueda y auto-refresh cada 30s
- [x] Modal unificado de crear/editar vehículo con upload de fotos y RUNT
- [x] Slider de criticidad con gradiente de colores y vínculo automático con el estado
- [x] Botón refrescar con animación de giro durante la carga
- [x] Cards de estadísticas clickeables para filtrar por estado
- [x] Componente Toast reutilizable con posición configurable y animación de salida
- [x] Manejo global de sesión expirada (401 → redirección automática al login)
- [x] Vista detallada de vehículo con galería de fotos navegable (Lightbox con teclas)
- [x] Visor del RUNT en PDF embebido (iframe nativo del navegador)

### Detalle Fase 3 (completada)

**Base de datos**
- [x] Tabla `categorias_chequeo` con las categorías del checklist (con icono y orden)
- [x] Tabla `items_chequeo` con los 39 ítems normativos, su categoría, criticidad y a qué tipos de vehículo aplican
- [x] Tabla `preguntas_aptitud` con las 5 preguntas eliminatorias del conductor
- [x] Tabla `chequeos_preoperacionales` (cabecera con vehículo, conductor, fecha, resultado, contadores)
- [x] Tabla `respuestas_chequeo` (una respuesta por ítem en cada chequeo)
- [x] Tabla `respuestas_aptitud` (5 respuestas de aptitud por chequeo)
- [x] Tabla `fotos_chequeo` (evidencia fotográfica de ítems NO CUMPLE)
- [x] Tabla `intentos_chequeo_bloqueado` (registro de chequeos bloqueados por el sistema)
- [x] Tabla `auditoria_chequeos` (todas las acciones sobre chequeos)
- [x] Tabla `excepciones_items_vehiculo` (ítems no aplicables a vehículos específicos)

**Backend**
- [x] Endpoint del catálogo del chequeo (`GET /api/chequeos/catalogo`) con categorías, ítems y preguntas
- [x] Endpoints CRUD del catálogo desde admin (categorías, ítems, preguntas de aptitud)
- [x] Endpoint para iniciar chequeo (`POST /api/chequeos/iniciar`) con validación de aptitud y registro de intentos bloqueados
- [x] Endpoint para guardar las 39 respuestas en lote (`PUT /api/chequeos/:id/respuestas`)
- [x] Endpoint para cerrar chequeo (`POST /api/chequeos/:id/cerrar`) con cálculo automático del resultado y detección de fallas críticas
- [x] Endpoints de la vista admin: lista con filtros (`GET /api/chequeos`), detalle (`GET /api/chequeos/:id`), intentos bloqueados (`GET /api/chequeos/intentos-bloqueados`)
- [x] Endpoint de vehículos disponibles del conductor (`GET /api/chequeos/vehiculos-disponibles`)
- [x] Endpoints de fotos de evidencia: subir, eliminar, marcar como preservar siempre
- [x] Eliminación inteligente del catálogo (hard delete si no tiene historial, soft delete si ya fue usado)

**Frontend del conductor**
- [x] Dashboard del conductor (distinto al del admin) con 2 círculos centrales
- [x] Pantalla de aptitud con las 5 preguntas eliminatorias
- [x] Pantalla de selección de vehículo con búsqueda tolerante de placa (ignora espacios y mayúsculas)
- [x] Checklist en 5 pantallas (una por categoría) optimizado para móvil
- [x] Subida y eliminación de fotos de evidencia para ítems NO CUMPLE
- [x] Compresión de imágenes en el navegador antes de subir (canvas, max 1600px, calidad 0.85)
- [x] Pantalla de resultado con semáforo y resumen de contadores
- [x] Cambio de contraseña en primer login sin pedir la actual

**Frontend del admin (chequeos)**
- [x] Lista de chequeos con filtros (fecha, placa tolerante, estado, oficial/cerrado) y paginación
- [x] Detalle del chequeo con cabecera, vehículo, conductor, aptitud, checklist por categoría
- [x] Página de intentos bloqueados con filtros por razón y paginación
- [x] Botón "Preservar siempre" en fotos del detalle admin
- [x] Admin del catálogo (`/admin/catalogo`) con CRUD para categorías, ítems y preguntas

**Infraestructura**
- [x] Acceso desde celular en LAN (URLs dinámicas + Vite host + CORS amplio en dev)
- [x] Documento `docs/MAPA_DEL_CODIGO.md` como guía rápida para desarrolladores nuevos
- [x] Convención de contraste accesible añadida a `CONTEXTO_PROYECTO.md` §17
- [x] Reorganización de bitácora en `docs/bitacora/` con sección de bugs conocidos y carpeta de evidencias

### Detalle Fase 4 (en curso)

**Bloque A — Módulo de usuarios admin (completado)**
- [x] Hacer `centro_id` obligatorio para conductores y `admin_centro` (frontend + backend)
- [x] Validación de licencia + EPS + ARL obligatorios para conductores
- [x] Mostrar correo del conductor en modal editar (merge con `auth.users`)
- [x] Cambiar correo del conductor con verificación de contraseña del admin
- [x] Cambiar cédula del conductor con verificación de contraseña del admin + aviso amarillo crítico
- [x] Vista detalle del perfil de usuario (`/admin/usuarios/:id`) con historial de chequeos + timeline de actividad
- [x] Validaciones de inputs en formularios (cédula numérica, nombre solo letras, teléfono, licencia)
- [x] Avisos visuales temporales al escribir caracteres inválidos
- [x] Toast notifications en lugar de `alert()` para todas las acciones
- [x] Botón "Refrescar" en lista de usuarios
- [x] Endpoint `GET /api/geo/centros` para selector de centro
- [x] Componente reutilizable `InputPassword` con botón "ojo" en los 3 lugares con contraseña (Login, CambiarPassword, ModalVerificacionAdmin)
- [x] Fix login con cuenta desactivada: mensaje claro "Cuenta desactivada" tras validar contraseña (opción C híbrida sin account enumeration)

**Bloque B — Navegación unificada + dashboard administrativo (completado)**
- [x] Componente `AdminLayout` con sidebar siempre abierto en escritorio (colapsable) y overlay en móvil
- [x] Componente `Sidebar` con 6 items y NavLink que detecta el activo
- [x] Componente `Campanita` placeholder con punto rojo controlado por prop
- [x] Componente reutilizable `BotonVolver` para páginas de detalle
- [x] Refactor de 8 páginas admin para usar `AdminLayout` (5 con sidebar, 3 de detalle con `BotonVolver`)
- [x] Endpoint `GET /api/dashboard/stats` con KPIs del día + alertas, diferenciado por rol del usuario
- [x] Dashboard rediseñado con 4 cajas grandes clicables y sección "Necesita atención"
- [x] Alertas accionables: licencias por vencer (30 días), vehículos sin RUNT, vehículos no operativos
- [x] Auto-refresh cada 60s y campanita activa automáticamente cuando hay alertas

**Bloque C — Notificaciones en tiempo real (pendiente)**
- [ ] Tabla `notificaciones` en BD
- [ ] Endpoint `GET /api/notificaciones`, `PATCH /api/notificaciones/:id/leer`
- [ ] Cablear campanita real con lista desplegable
- [ ] Realtime con Supabase Realtime para nuevas notificaciones
- [ ] Eventos que disparan notificación: chequeo no operativo, intento bloqueado, vehículo desactivado, licencia próxima a vencer

**Bloque D — Preparación del despliegue (pendiente)**
- [ ] Build de producción del frontend
- [ ] Despliegue del backend
- [ ] Variables de entorno de producción
- [ ] Pruebas end-to-end del flujo completo
- [ ] Documentación de despliegue

**Roles administrativos multinivel (✅ completado)**
- [x] Jerarquía de 5 niveles: superadmin → admin regional → departamental → ciudad → centro (+ conductor)
- [x] Scope territorial: cada admin solo ve y gestiona lo de su área (servicio `scope.service.js`)
- [x] Reglas de jerarquía: solo se crean/gestionan roles de rango inferior; nadie elimina a un par (`jerarquia.service.js`)
- [x] Creación y edición de usuarios con selector de rol limitado y territorio adaptativo (centro/ciudad/departamento/región)
- [x] Cambio de rol desde edición con validaciones (nadie cambia su propio rol)
- [x] Superadmin puede nombrar otros superadmins (continuidad), pero no eliminarlos/editarlos
- [x] Columna "Ámbito" y filtro por ciudad en Gestión de usuarios
- [x] Seed de geografía nacional: 33 capitales + Espinal y centros SENA de muestra

### Pendientes futuros (ver `docs/bitacora/semana-5-cambios.md`)

- [x] Perfil propio del administrador (con regla: cédula/correo solo cambiable por superior)
- [ ] Módulo de Ajustes con modo claro/oscuro
- [ ] Pantallas de gestión de la geografía (añadir ciudades y centros desde la app, sin SQL)
- [x] Repulir interfaz del conductor con la misma calidad visual del admin

---

## 🔒 Seguridad

- Las variables sensibles viven en `backend/.env` (excluido por `.gitignore`)
- La `service_role key` de Supabase y las API keys de Cloudinary nunca se exponen al frontend
- Contraseñas de usuarios manejadas por Supabase Auth (bcrypt interno)
- Sesiones manejadas por Supabase Auth (access token con TTL de 24h, refresh token disponible para extender)
- Control de acceso multinivel validado en el servidor: scope territorial + jerarquía de rangos en cada operación sobre usuarios
- Contraseñas temporales generadas automáticamente al crear usuarios
- Cambio obligatorio de contraseña en el primer inicio de sesión
- Verificación de contraseña actual antes de permitir cambios
- Validación de tipo y tamaño de archivos en uploads (máx. 5 MB, solo imágenes)
- Auditoría completa de acciones administrativas en tabla `auditoria_usuarios`

---

## 👥 Equipo

Proyecto desarrollado en el marco del programa **SENNOVA / ID+I** del SENA Regional Tolima — Centro de Industria y Construcción.

---

## 📄 Licencia

Proyecto institucional SENA — uso interno.
