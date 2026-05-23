# Sistema de Gestión de Flota Vehicular — SENA Regional Tolima

Proyecto **ID+I / SENNOVA** — Centro de Industria y Construcción.

Sistema web para el chequeo preoperacional digital de la flota institucional, con detección automática de fallas, alertas en tiempo real al coordinador y gestión preventiva de vencimientos (SOAT, RTM, extintor, licencia).

---

## 🛠️ Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite + CSS modular |
| Backend | Node.js 24 + Express 5 |
| Base de datos | Supabase (PostgreSQL en la nube) |
| Autenticación | Supabase Auth |
| Storage | Supabase Storage (fotos de vehículos) |
| Tiempo real | Supabase Realtime (alertas al admin) |
| Correo | Nodemailer (envíos automáticos) |

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
│   │   ├── components/       → Componentes reutilizables
│   │   ├── pages/            → Páginas de la app
│   │   ├── styles/           → CSS global (variables, reset, global, animations)
│   │   ├── assets/           → Imágenes y recursos
│   │   ├── App.jsx           → Componente raíz
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

### 4. Verificar conexión

Abre `http://localhost:5173` y revisa el cuadro "Estado del sistema". Los 4 indicadores deben aparecer en verde:

- Frontend: Activo
- Backend: Conectado
- Supabase: Conectado
- Usuarios: 0 (al inicio)

---

## 📋 Fases de desarrollo

| Fase | Descripción | Estado |
|------|-------------|--------|
| 0 | Fundación: estructura, frontend base, backend base, Supabase | ✅ |
| 1 | Autenticación: login, roles, gestión de usuarios | 🔄 En curso |
| 2 | Gestión de vehículos: CRUD admin, fotos, datos | ⏳ |
| 3 | Flujo del conductor: aptitud + chequeo de 39 ítems | ⏳ |
| 4 | Dashboard del admin: semáforo, historial, alertas | ⏳ |
| 5 | Notificaciones: campanita en sitio + correo | ⏳ |
| 6 | Reportes: exportación Excel/PDF, envío automático | ⏳ |
| 7 | Vencimientos automáticos: SOAT, RTM, extintor, licencia | ⏳ |
| 8 | Pruebas TRL 6 → TRL 7: validación end-to-end y campo real | ⏳ |

---

## 🔒 Seguridad

- Las variables sensibles viven en `backend/.env` (excluido por `.gitignore`)
- La `service_role key` de Supabase nunca se expone al frontend
- Contraseñas de usuarios manejadas por Supabase Auth (bcrypt interno)
- Sesiones con JWT con expiración de 12 horas
- Bloqueo automático tras 5 intentos fallidos de login

---

## 👥 Equipo

Proyecto desarrollado en el marco del programa **SENNOVA / ID+I** del SENA Regional Tolima — Centro de Industria y Construcción.

---

## 📄 Licencia

Proyecto institucional SENA — uso interno.
