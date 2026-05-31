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
| 2 | Gestión de vehículos: CRUD admin, fotos, datos | 🔄 En curso |
| 3 | Flujo del conductor: aptitud + chequeo de 39 ítems | ⏳ |
| 4 | Dashboard del admin: semáforo, historial, alertas | ⏳ |
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

### Detalle Fase 2 (en curso)

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
- [ ] Configuración de ítems del checklist no aplicables por vehículo (prep. Fase 3)

---

## 🔒 Seguridad

- Las variables sensibles viven en `backend/.env` (excluido por `.gitignore`)
- La `service_role key` de Supabase y las API keys de Cloudinary nunca se exponen al frontend
- Contraseñas de usuarios manejadas por Supabase Auth (bcrypt interno)
- Sesiones manejadas por Supabase Auth (access token con TTL de ~1h, refresh token disponible para extender)
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
