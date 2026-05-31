# Semana 3 — Detalle técnico de cambios

**Periodo:** 26 mayo - 1 junio de 2026
**Fase del proyecto:** Fase 2 (Gestión de vehículos)

Este archivo documenta el detalle técnico crudo. Para el resumen ejecutivo ver `bitacora.docx`.

---

## Componentes y módulos creados

### `frontend/src/components/Toast/`
Notificación flotante reutilizable.

**Props:**
- `mensaje` (string, requerido): texto del toast
- `tipo` (`"exito"` | `"error"` | `"advertencia"` | `"info"`): determina color e ícono
- `duracion` (number, default 3500ms): tiempo antes de auto-cerrar
- `posicion` (`"abajo-derecha"` | `"arriba-centro"`): dónde aparece
- `onCerrar` (function): callback al cerrar

**Comportamiento:**
- Anima entrada (slideInRight o slideInDown)
- Muestra barra de progreso que se va vaciando
- Anima salida (slideOutRight o slideOutUp) antes de desmontar
- Click en X dispara la misma animación de salida

**Uso ejemplo:**
```jsx
const [toast, setToast] = useState(null);
const mostrarToast = (mensaje, tipo = "exito", posicion = "abajo-derecha") =>
    setToast({ mensaje, tipo, posicion, key: Date.now() });

// En el render:
{toast && (
    <Toast
        key={toast.key}
        mensaje={toast.mensaje}
        tipo={toast.tipo}
        posicion={toast.posicion}
        onCerrar={() => setToast(null)}
    />
)}
```

### `frontend/src/pages/VehiculosAdmin/components/ModalVehiculo.jsx`
Modal unificado de crear y editar vehículo. Reemplaza al anterior `ModalCrearVehiculo`.

**Props nuevas:**
- `vehiculo` (object, opcional): si viene → modo editar; si es null → modo crear
- `mostrarToast` (function): callback para mostrar notificaciones

**Cambios respecto al anterior:**
- Pre-carga todos los campos cuando `vehiculo` viene
- Lista fotos existentes con botones inline (Principal, Eliminar) que se ejecutan inmediatamente
- Muestra link al RUNT actual con botón eliminar/reemplazar
- Submit hace POST o PATCH según el modo
- Botón cambia: "Crear vehículo" vs "Guardar cambios"
- Título cambia: "Crear nuevo vehículo" vs "Editar vehículo · OCJ 441"

### `backend/src/utils/keepAlive.js`
Heartbeat que mantiene la conexión Supabase viva. **Parche temporal**, ver `bugs-conocidos.md`.

**Funciones exportadas:**
- `iniciarKeepAlive()`: arranca el setInterval cada 4 minutos
- `detenerKeepAlive()`: limpia el intervalo (llamar en SIGINT/SIGTERM)

**Comportamiento:**
- Ejecuta `supabase.from('vehiculos').select('id').limit(1)` cada 240s
- Log discreto: sólo escribe al arrancar y en caso de fallos
- Track de fallos consecutivos para reportar recuperación

---

## Cambios en archivos existentes

### `frontend/src/lib/api.js`
- Agregado `cache: 'no-store'` al objeto de config del fetch
- Agregados headers `Cache-Control: no-cache, no-store, must-revalidate` y `Pragma: no-cache`
- Para GET requests, se añade `?_=Date.now()` al final del URL (cache-bust)
- Detección de status 401: dispara `CustomEvent('auth:expirado')` para que la app entera se entere
- Excepto en `/auth/login` (porque el 401 ahí es credencial inválida, no sesión expirada)
- El error lanzado tiene flag `err.sesionExpirada = true` para que llamadores puedan ignorarlo

### `frontend/src/contexts/AuthContext.jsx`
- Corregido typo: `localStorage.romoveItem` → `removeItem`
- Agregado listener de `auth:expirado` que limpia sesión y dispara redirección
- Nuevo estado `sesionExpirada` y método `consumirSesionExpirada` (para que login muestre toast informativo)

### `frontend/src/components/Modal/Modal.jsx`
- Removido `onClick={onCerrar}` del overlay
- El modal sólo cierra con la X o tecla Esc

### `frontend/src/pages/VehiculosAdmin/VehiculosAdmin.jsx`
- Estado `toast` con función helper `mostrarToast(mensaje, tipo, posicion)`
- Estado `vehiculoEnEdicion` para abrir el modal en modo editar
- `cargarVehiculos` acepta `{ silencioso: true }` para no mostrar "Cargando..."
- Auto-refresh cada 30s con setInterval (sólo si usuario está logueado)
- Toast disparado en cada acción exitosa (crear, editar, eliminar, desactivar, reactivar)
- Card de "No operativo" agregada como tarjeta independiente (color `oscuro` = `#374151`)
- Botón "Editar" en cada card abre el modal en modo edición

### `frontend/src/pages/VehiculosAdmin/components/ModalVehiculo.jsx`
- Constantes `ESTADOS` con campos extra: `min`, `max`, `centro` por estado
- Helpers `estadoDesdeCriticidad(nivel)` y `centroDeEstado(estado)`
- Handlers `cambiarEstado` y `cambiarCriticidad` que mantienen ambos campos sincronizados
- Validación de archivos con `mostrarToast` arriba-centro al rechazar
- Botones de subida muestran límite (`Máximo 5 MB c/u · JPEG, PNG o WebP`)

### `backend/src/controllers/vehiculos.controller.js`
- `eliminarVehiculo`: ahora limpia todas las fotos y RUNT en Cloudinary antes de borrar de BD

### `backend/src/server.js`
- Import de keepAlive
- `iniciarKeepAlive()` llamado al arrancar `app.listen`
- Handlers SIGINT/SIGTERM con `detenerKeepAlive()` + `servidor.close()`

---

## Decisiones de diseño relevantes

### Vínculo automático Estado ↔ Nivel de criticidad
Cada estado tiene un rango de criticidad asociado:

| Estado | Rango | Centro |
|---|---|---|
| Operativo | 0-19% | 10% |
| Observación | 20-39% | 30% |
| Alerta | 40-59% | 50% |
| Crítico | 60-89% | 75% |
| No operativo | 90-100% | 95% |

Al cambiar el estado, el slider se posiciona en el centro del rango. Al mover el slider, el estado se recalcula automáticamente. Imposible registrar combinaciones absurdas como "Crítico al 0%".

### Multi-tenant por centro
El admin sólo ve vehículos de su propio `centro_id`. Si tu admin tiene `centro_id = X`, la query del backend filtra automáticamente por `eq("centro_id", X)`. Si el admin no tiene `centro_id`, no se aplica filtro (modo superadmin).

### Acciones inmediatas vs diferidas en modal de editar
- **Inmediatas** (se ejecutan al instante con request al backend): eliminar foto existente, marcar foto principal, eliminar RUNT actual.
- **Diferidas** (esperan al "Guardar cambios"): subir fotos nuevas, reemplazar RUNT por uno nuevo, editar campos del formulario.

Las inmediatas son destructivas; queremos consistencia con BD al instante. Las diferidas son aditivas; se hacen en batch al confirmar.

---

## Actualización masiva de vehículos (SQL ejecutado)

Para alinear los 10 vehículos con los nuevos rangos, se corrió este UPDATE:

```sql
update vehiculos
set
    nivel_criticidad = case placa
        when 'OCJ 453' then 85
        when 'OJX 793' then 95
        when 'OKL 210' then 90
        when 'OJX 371' then 85
        when 'OCJ 442' then 70
        when 'OCJ 441' then 55
        when 'OCJ 451' then 40
        when 'PXS 700' then 25
        when 'OJY 101' then 15
        when 'ABC123' then 0
        else nivel_criticidad
    end,
    estado = case placa
        when 'OCJ 453' then 'critico'
        when 'OJX 793' then 'no_operativo'
        when 'OKL 210' then 'no_operativo'
        when 'OJX 371' then 'critico'
        when 'OCJ 442' then 'critico'
        when 'OCJ 441' then 'alerta'
        when 'OCJ 451' then 'alerta'
        when 'PXS 700' then 'observacion'
        when 'OJY 101' then 'operativo'
        when 'ABC123' then 'operativo'
        else estado
    end,
    updated_at = now()
where centro_id = 'b99023b0-2d47-4754-a085-8facfc11c93a';
```

Distribución resultante:
- No operativo: 2 (OJX 793, OKL 210)
- Crítico: 3 (OCJ 453, OJX 371, OCJ 442)
- Alerta: 2 (OCJ 441, OCJ 451)
- Observación: 1 (PXS 700)
- Operativo: 2 (OJY 101, ABC123)

---

## Endpoints disponibles tras esta semana

Todos requieren `verificarToken + soloAdmin`.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/vehiculos` | Listar (filtrados por centro_id del admin) |
| GET | `/api/vehiculos/:id` | Obtener con fotos completas |
| POST | `/api/vehiculos` | Crear |
| PATCH | `/api/vehiculos/:id` | Actualizar campos |
| PATCH | `/api/vehiculos/:id/desactivar` | Soft delete |
| PATCH | `/api/vehiculos/:id/reactivar` | Reactivar |
| DELETE | `/api/vehiculos/:id` | Hard delete (limpia Cloudinary) |
| POST | `/api/vehiculos/:id/fotos` | Subir fotos (multer, máx 5 MB c/u) |
| DELETE | `/api/vehiculos/:id/fotos/:foto_id` | Eliminar foto (BD + Cloudinary) |
| PATCH | `/api/vehiculos/:id/fotos/:foto_id/principal` | Marcar como principal |
| POST | `/api/vehiculos/:id/runt` | Subir/reemplazar PDF |
| DELETE | `/api/vehiculos/:id/runt` | Eliminar RUNT |

---

## Pendientes técnicos para la siguiente iteración

1. Vista detallada de vehículo con galería lightbox y visor PDF del RUNT (Tarea #22)
2. Investigar causa raíz del bug Supabase dormido (eliminar dependencia del keep-alive)
3. Validación al crear admin: que `centro_id` sea válido y exista en la tabla `centros_formacion`
4. Modal de cambio de password ofrecer ver/ocultar texto
5. Considerar paginación en listado de vehículos cuando crezca (~50+)
