# Bugs conocidos del proyecto

Estado actualizado a: **2 de junio de 2026**.

Cada bug tiene: síntoma, causa raíz, fix aplicado, estado (resuelto / parcheado / pendiente) y, si aplica, advertencia para producción.

> 💡 Si un bug tiene capturas de pantalla, se guardan en `docs/bitacora/evidencias/` con el formato `BUG-XXX_descripcion.png`. Ver `evidencias/README.md` para la convención.

---

## ⚠️ BUG-001 — Cliente Supabase pierde conexiones tras inactividad

**Estado:** Parcheado, no resuelto a fondo.

**Síntoma:**
Después de ~5 minutos de inactividad, las queries de Supabase desde el backend empiezan a devolver arrays vacíos sin error. Reiniciar el proceso del backend lo soluciona temporalmente.

**Cómo detectarlo:**
- `GET /api/vehiculos` devuelve `{"vehiculos": []}` con status 200 cuando la BD sí tiene datos.
- Logs del backend muestran `data length: 0` en `vehiculos.controller.js` aunque la BD tenga registros.
- F12 Network no muestra error, sólo respuesta vacía.

**Causa probable:**
Supabase cierra silenciosamente las conexiones cliente ociosas tras ~5 minutos. El cliente `@supabase/supabase-js@2.106.1` no detecta esta desconexión: sigue intentando usar la conexión muerta y recibe respuestas vacías en lugar de errores explícitos.

**Fix aplicado (parche):**
`backend/src/utils/keepAlive.js` ejecuta un heartbeat cada 4 minutos haciendo una query trivial. Esto mantiene la conexión activa.

**Lo que NO resuelve el parche:**
- Si el keep-alive falla (red caída momentáneamente), la conexión puede quedar muerta hasta el próximo intento exitoso.
- No detecta otros casos de conexión zombie que no sean por inactividad.

**🚨 Antes de producción:**
1. Probar versión más reciente de `@supabase/supabase-js`.
2. Investigar si hay configuración del cliente para reconexión automática.
3. Considerar migrar a llamadas REST directas vía PostgREST (`fetch` simple sin estado).
4. Monitorear con APM (Sentry, Datadog) qué tan seguido falla el heartbeat en producción.

**📌 Caso confirmado el 2026-06-02 (Fase 3, primer endpoint del catálogo):**
- Síntoma: `GET /api/chequeos/catalogo` devolvía `200 OK` con `{categorias: [], items: [], preguntas: []}` aunque la BD tenía los 39 ítems cargados.
- Causa: backend recién arrancado, conexión Supabase fría, primera petición pegó antes del primer latido del keep-alive.
- Refuerzo agregado al parche: `iniciarKeepAlive()` ahora es **bloqueante** al arrancar. El servidor no termina su `app.listen` hasta que el primer latido confirma la conexión activa. Mensaje en terminal: `[KEEP-ALIVE] Calentando conexion Supabase...` → `[KEEP-ALIVE] Conexion lista. Activo cada 240s`.

**Archivos relacionados:**
- `backend/src/utils/keepAlive.js`
- `backend/src/server.js` (iniciar/detener)
- `backend/src/config/supabase.js` (cliente)

---

## ✅ BUG-002 — Cache HTTP stale en navegador

**Estado:** Resuelto.

**Síntoma:**
Tras apagar y prender el computador o cambios de viewport (DevTools emulador móvil), la página de vehículos quedaba con lista vacía aunque la BD tenía datos. F12 mostraba "200 OK" con `{"vehiculos":[]}` pero los logs del backend no registraban la petición — el navegador servía respuesta cacheada sin pegarle al backend.

**Causa raíz:**
En versiones tempranas del backend, no se enviaba `Cache-Control: no-store`. El navegador cacheó respuestas indefinidamente (HTTP cache persistente en disco que sobrevive entre sesiones). Aunque después se agregó el header, los archivos cacheados antiguos seguían siendo servidos.

**Fix aplicado:**
En `frontend/src/lib/api.js`:
```js
const config = {
    ...options,
    headers: {
        ...headers,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
    },
    cache: 'no-store',
};

// Para GETs, sufijo cache-bust único
const urlFinal = metodo === 'GET'
    ? `${API_URL}${endpoint}${separador}_=${Date.now()}`
    : `${API_URL}${endpoint}`;
```

Triple defensa:
1. `cache: 'no-store'` en fetch → navegador no usa ni guarda caché para esta petición.
2. Headers explícitos → si algo intercepta entre frontend y backend, también respeta no-cache.
3. Timestamp único en URL → si por algún motivo hay caché viejo, nunca matcheará la nueva URL.

**Mitigación para usuarios ya afectados:**
Una sola vez: DevTools → Application → Clear site data → recargar.

**Archivos relacionados:**
- `frontend/src/lib/api.js`
- `backend/src/server.js` (middleware de cache)

---

## ✅ BUG-003 — Typo `romoveItem` en AuthContext

**Estado:** Resuelto.

**Síntoma:**
Cuando un token vencía o se invalidaba, el localStorage no se limpiaba. El usuario quedaba con un token muerto guardado y la app no podía recuperarse sin limpiar manualmente.

**Causa:**
Error de escritura en `frontend/src/contexts/AuthContext.jsx`:
```js
.catch(() => {
    localStorage.romoveItem('token'); // ← typo: debería ser removeItem
    setUsuario(null);
})
```

JavaScript no detecta este tipo de errores en tiempo de compilación. La llamada silenciosamente no hacía nada.

**Fix aplicado:**
Corregido a `localStorage.removeItem('token')` y se reforzó el manejo global de sesión expirada con un `CustomEvent('auth:expirado')` que escucha el AuthContext.

---

## ✅ BUG-004 — Modal se cerraba con click fuera (UX)

**Estado:** Resuelto.

**Síntoma:**
Mientras se llenaba un formulario largo (crear vehículo) y el usuario hacía click accidental fuera del modal, todo se perdía.

**Fix aplicado:**
En `frontend/src/components/Modal/Modal.jsx`, removido el `onClick={onCerrar}` del overlay. Ahora el modal sólo cierra con la X o con tecla Esc.

---

## ✅ BUG-005 — Estado y Criticidad podían ser incoherentes

**Estado:** Resuelto.

**Síntoma:**
Era posible registrar un vehículo con estado "Crítico" y nivel de criticidad 0%, o "Operativo" al 95%. Inconsistencia interna del modelo.

**Causa:**
Los dos campos eran 100% independientes en el formulario.

**Fix aplicado:**
Vínculo automático bidireccional con rangos definidos por estado (ver `semana-3-cambios.md` → "Vínculo automático Estado ↔ Nivel de criticidad"). Implementado en `ModalVehiculo.jsx`.

---

## ✅ BUG-007 — RUNT no se visualizaba (Cloudinary 401)

**Estado:** Resuelto.

**Síntoma:**
- El visor del RUNT mostraba recuadro gris vacío.
- Abrir en pestaña nueva → "página no funciona".
- F12 Network → la petición al `.pdf` devolvía status **401 Unauthorized**.
- URL del archivo era válida y terminaba en `.pdf`.

**Causa raíz:**
Cloudinary **bloquea por defecto** la entrega de archivos PDF y ZIP desde 2019 como medida de seguridad. Esta restricción está activa en todas las cuentas nuevas y debe habilitarse manualmente.

**Intentos fallidos previos (registro para no repetir):**
1. **`fl_attachment:false` en URL**: incorrecto. `fl_attachment:VALOR` en Cloudinary interpreta `VALOR` como el nombre de archivo, no como un flag booleano. La URL resultante hacía descargar con nombre "false".
2. **Subir PDF como `image` con transformaciones**: el `fetch_format: "auto"` convertía el PDF a JPG durante la subida. La URL quedaba con extensión `.jpg` y Cloudinary servía sólo la primera página convertida a imagen.
3. **Google Docs Viewer (`gview`)**: oficialmente deprecado, devuelve "No hay vista previa disponible" para PDFs de Cloudinary.

**Solución aplicada:**
1. **En el dashboard de Cloudinary**: Settings → Security → activar **"PDF and ZIP files delivery"** → Save.
2. **En backend** (`vehiculos.controller.js`): subir RUNT con `resource_type: "image"` + `format: "pdf"` + sin transformaciones de imagen. Esto preserva el formato PDF original.
3. **En frontend** (`VehiculoDetalle.jsx` y `ModalVehiculo.jsx`): usar la URL directa de Cloudinary en el iframe y en los enlaces. El navegador moderno muestra el PDF inline con su visor integrado.

**Archivos relacionados:**
- `backend/src/services/vehiculos.service.js` (función `subirArchivoACloudinary` con parámetro `formato`)
- `backend/src/controllers/vehiculos.controller.js` (función `subirRunt`)
- `frontend/src/pages/VehiculoDetalle/VehiculoDetalle.jsx`
- `frontend/src/pages/VehiculosAdmin/components/ModalVehiculo.jsx`
- `frontend/src/lib/cloudinary.js` (helper que terminó vacío, sólo con nota explicativa)

**⚠️ Para producción:**
Documentar en el manual de despliegue que tras crear la cuenta de Cloudinary del cliente, hay que **habilitar PDF/ZIP delivery** desde el dashboard antes de que el sistema pueda mostrar los RUNT. Si el cliente migra a otra cuenta Cloudinary o crea una nueva, este paso debe repetirse.

---

## ✅ BUG-008 — RLS habilitado por defecto en tablas creadas vía SQL Editor

**Estado:** Resuelto.

**Síntoma:**
- El endpoint `GET /api/chequeos/catalogo` devolvía `200 OK` con `{categorias: [], items: [], preguntas: []}` aunque la BD tenía los 39 ítems cargados.
- Logs del backend mostraban `count: 5, error: null` para las queries — Supabase decía que devolvió 5 filas pero el body de la respuesta llegaba con array vacío.
- Pasaba consistentemente en la primera petición tras arranque del backend.

**Causa raíz:**
Supabase **habilita Row Level Security (RLS) por defecto** en todas las tablas que se crean desde su SQL Editor. Aunque el backend usa `service_role_key` (que **debería** bypasear RLS), la combinación de RLS sin policies + conexión recién levantada producía comportamiento inconsistente donde las queries reportaban éxito pero devolvían arrays vacíos.

**Por qué no se detectó antes:**
- En Fase 1 ya habíamos deshabilitado RLS en `usuarios` y `auditoria_usuarios` (ver BUG histórico de Semana 2: "Error de Row Level Security al crear usuarios").
- En Fase 2 las tablas geográficas (regiones, departamentos, ciudades, centros_formacion) y de vehículos también quedaron con RLS habilitado, pero no causaron problemas inmediatos porque las primeras consultas siempre llegaban con conexión "caliente" después de muchas otras peticiones del frontend.
- En Fase 3 se manifestó porque el endpoint del catálogo fue la **primera** petición tras arrancar el backend, antes de que ninguna otra hubiera "calentado" el cliente Supabase.

**Solución aplicada:**
1. **Deshabilitar RLS en todas las tablas del proyecto** desde el SQL Editor:
```sql
ALTER TABLE categorias_chequeo DISABLE ROW LEVEL SECURITY;
ALTER TABLE items_chequeo DISABLE ROW LEVEL SECURITY;
ALTER TABLE preguntas_aptitud DISABLE ROW LEVEL SECURITY;
-- ... y todas las demás
```
2. **Incluir las sentencias `DISABLE ROW LEVEL SECURITY`** al final de `database/database.sql` para que cualquier reconstrucción de la BD desde cero quede consistente.

**📌 Para producción:**
La decisión de no usar RLS está alineada con la arquitectura del proyecto: el frontend NUNCA habla directamente con Supabase, todo pasa por el backend que autentica con tokens y autoriza con middlewares. RLS sería redundante. Esta decisión queda documentada también en `CONTEXTO_PROYECTO.md` sección 12.

**Archivos relacionados:**
- `database/database.sql` (incluye las 19 sentencias `DISABLE ROW LEVEL SECURITY`)
- `docs/CONTEXTO_PROYECTO.md` sección 12 (decisión de diseño)

---

## 🔄 BUG-006 — Login devuelve 401 si se reintenta muy rápido

**Estado:** Hipótesis sin confirmar / posible falso positivo.

**Síntoma:**
Tras un login fallido por password incorrecto, intentos consecutivos rápidos pueden devolver 401 aunque las credenciales sean correctas.

**Causa hipotética:**
Rate limit interno de Supabase Auth para protección contra ataques. Si se confirma, agregar un cooldown en el frontend tras un login fallido.

**Acción pendiente:**
Reproducir el bug intencionalmente para confirmar. Si es rate limit, mostrar mensaje claro al usuario: "Has intentado iniciar sesión muchas veces. Espera unos segundos."

---

## ✅ BUG-009 — Resumen del chequeo mostraba 0/0/0 en la pantalla de resultado

**Estado:** Resuelto el 2026-06-02.

**Síntoma:**
Al finalizar un chequeo preoperacional (incluso con varios ítems marcados como NO CUMPLE), la pantalla de resultado mostraba el resumen en ceros:
- Cumple: **0**
- No cumple: **0**
- N/A: **0**

El estado general del vehículo (Operativo / No operativo / etc.) sí se calculaba correctamente, pero los conteos del resumen estaban vacíos. Esto desconcertaba al conductor porque parecía que el chequeo no había guardado nada.

**📸 Evidencia visual:**
- `evidencias/BUG-009_resumen-0-0-0.png` — captura del usuario mostrando la pantalla de "Vehículo NO OPERATIVO" con todos los conteos en 0.
- *(Pendiente)* `evidencias/BUG-009_resumen-correcto-despues-del-fix.png` — captura tras el fix mostrando los conteos reales.

**Causa raíz:**
Desalineación de nombres de campo entre backend y frontend.

| Concepto | Backend devolvía | Frontend leía |
|---|---|---|
| Cumple | `items_cumple_count` | `total_cumple` ❌ |
| No cumple | `items_no_cumple_count` | `total_no_cumple` ❌ |
| N/A | `items_no_aplica_count` | `total_no_aplica` ❌ |
| Críticos en NO CUMPLE | *(no se calculaba)* | `total_criticos_no_cumple` ❌ |

Como ningún nombre coincidía, cada lectura caía al fallback `?? 0`.

Además, el cálculo del conteo de **ítems críticos en NO CUMPLE** (el badge rojo destacado de la pantalla de resultado) no existía en el backend: solo se guardaba el booleano `tiene_falla_critica`.

**Fix aplicado:**

1. **`backend/src/services/chequeos.service.js → cerrarChequeo()`**: se agregó el cálculo del conteo de críticos en NO CUMPLE y se devuelve como `items_criticos_no_cumple` a nivel root de la respuesta.

```js
const itemsCriticosNoCumple = respuestas.filter(
    (r) => r.estado === "no_cumple" && setCriticos.has(r.item_id)
).length;
```

2. **`backend/src/controllers/chequeos.controller.js → postCerrarChequeo`**: el controller no estaba reenviando el campo nuevo al frontend, se agregó al `res.json`.

3. **`frontend/src/pages/Conductor/ChequeoResultado.jsx`**: se alinearon los nombres de campo a los que realmente devuelve el backend:

```js
const totalCumple = chequeo.items_cumple_count ?? 0;
const totalNoCumple = chequeo.items_no_cumple_count ?? 0;
const totalNoAplica = chequeo.items_no_aplica_count ?? 0;
const totalCriticos = resp.items_criticos_no_cumple ?? 0;
```

**Lección para no repetirlo:**
- Cuando se diseñe un endpoint nuevo, **pegar literalmente el JSON de respuesta** en el archivo del frontend que lo consume, como comentario o constante de referencia.
- Considerar generar tipos compartidos o validar la respuesta con un schema (JSDoc, Zod, etc.) en próximas fases.
- En sesiones de QA del flujo del conductor (Fase 3), no quedarse solo con que "el estado final se calcula bien" — verificar también los conteos del resumen.

**Archivos relacionados:**
- `backend/src/services/chequeos.service.js`
- `backend/src/controllers/chequeos.controller.js`
- `frontend/src/pages/Conductor/ChequeoResultado.jsx`

---

## ✅ BUG-010 — Intentos bloqueados con vehiculo_id inexistente no se guardaban

**Estado:** Resuelto el 2026-06-02.

**Síntoma:**
Al hacer una prueba en Thunder Client del endpoint `POST /api/chequeos/iniciar` con un `vehiculo_id` que no existe en la BD (por ejemplo, el UUID de ceros `00000000-0000-0000-0000-000000000000`), el endpoint devolvía la respuesta correcta:

```json
{ "error": "Vehiculo no encontrado", "razon": "vehiculo_no_existe" }
```

Pero al ir a la pantalla del admin de intentos bloqueados (`/admin/chequeos/intentos-bloqueados`), el intento **no aparecía**. La tabla `intentos_chequeo_bloqueado` quedaba sin el registro.

**Causa raíz:**
La tabla `intentos_chequeo_bloqueado` tiene `vehiculo_id UUID REFERENCES vehiculos(id)`. Cuando el conductor mandaba un UUID que no existía en `vehiculos`, el INSERT al log violaba la **foreign key constraint** (código PostgreSQL `23503`).

El servicio `registrarIntentoBloqueado` solo logueaba el error con `console.error()` y no propagaba la excepción, por lo que el endpoint seguía su flujo normal, devolvía el error al cliente, pero el intento se perdía. El admin nunca se enteraba del intento.

Específicamente, en `iniciarChequeo` se hacía:

```js
vehiculoId: verif.vehiculo?.id || vehiculoId
```

Cuando `verif.vehiculo` era `null` (caso `vehiculo_no_existe`), terminaba pasando el UUID original del cliente, que no existía en la tabla `vehiculos`, generando la violación de FK.

**Fix aplicado:**

1. **`backend/src/services/chequeos.service.js → iniciarChequeo`**: cuando el vehículo no se pudo encontrar en la BD, se pasa explícitamente `null` en lugar del UUID del cliente:

```js
vehiculoId: verif.vehiculo?.id || null
```

2. **`backend/src/services/chequeos.service.js → registrarIntentoBloqueado`**: defensa adicional. Si el INSERT falla por la FK del vehículo (código `23503` o mensaje que mencione `vehiculo_id`), se reintenta automáticamente con `vehiculo_id = null`. Así el intento siempre queda registrado para auditoría, aunque el caller envíe un ID inválido por error.

**Detectado por:** El usuario, al probar manualmente el escenario `vehiculo_no_existe` desde Thunder Client durante la fase de QA del Bloque 4 (vista del admin).

**📸 Evidencia visual:**
- `evidencias/BUG-010_intento-no-aparece.png` *(pendiente — captura del usuario)*
- `evidencias/BUG-010_intento-correcto-despues-del-fix.png` *(pendiente)*

**Archivos relacionados:**
- `backend/src/services/chequeos.service.js`
