# Manual de uso del Sistema de Gestión de Flota Vehicular SENA

Este manual explica paso a paso cómo usar el sistema, tanto desde el panel del administrador como desde la aplicación del conductor.

> **Nota:** este documento se actualiza conforme avanza el desarrollo. Al cierre del proyecto se convertirá en el manual oficial para entregar al SENA (en Word o PDF).
>
> **Última actualización:** 3 de junio de 2026 (Cierre de Fase 3 — Sistema completo de extremo a extremo)

---

## Índice

1. [Acceso al sistema](#1-acceso-al-sistema)
2. [Primer ingreso (cambio obligatorio de contraseña)](#2-primer-ingreso)
3. [Flujo del Administrador](#3-flujo-del-administrador)
4. [Flujo del Conductor](#4-flujo-del-conductor)
5. [Cerrar sesión](#5-cerrar-sesion)
6. [Solución de problemas comunes](#6-solucion-de-problemas-comunes)

---

## 1. Acceso al sistema

### Cómo entrar

1. Abre el navegador (Chrome, Edge, Brave o Firefox).
2. Entra a la dirección del sistema (en local: `http://localhost:5173`, en producción la URL que asigne el SENA).
3. Vas a ver la pantalla de inicio de sesión con el logo del SENA en verde.

### Datos de inicio de sesión

Tienes que ingresar:

- **Correo o cédula**: puedes usar cualquiera de los dos. El sistema reconoce ambos.
- **Contraseña**: la que te entregó el administrador (si es tu primer ingreso) o la que ya cambiaste.

### Botón de inicio de sesión

Al pulsar **Iniciar sesión**, el sistema te lleva automáticamente a la pantalla correspondiente según tu rol:
- Si eres **administrador** → vas al panel de administración.
- Si eres **conductor** → vas al dashboard del conductor.

> Si te equivocas en el correo o contraseña 5 veces seguidas, el sistema bloquea la cuenta por 15 minutos por seguridad.

---

## 2. Primer ingreso

### Cambio obligatorio de contraseña

Cuando el administrador crea tu cuenta, te entrega una contraseña temporal. **La primera vez que ingreses**, el sistema te obliga a cambiarla por una propia.

### Pasos

1. Inicia sesión con la contraseña temporal que te dieron.
2. El sistema te lleva automáticamente a la pantalla **"Cambia tu contraseña"**.
3. Ingresa la nueva contraseña en el primer campo:
   - Mínimo 8 caracteres.
   - Recomendación: combina letras, números y al menos un signo (por ejemplo: `Patio2026!`).
4. Repítela en el campo **"Confirmar nueva contraseña"** para evitar errores.
5. Pulsa **Cambiar contraseña**.

> Importante: en el primer ingreso NO te piden la contraseña temporal de nuevo. Solo necesitas definir la nueva. Es así porque el sistema ya sabe que estás autenticado con la temporal y queremos facilitarte el proceso.

### Cambios posteriores de contraseña

Si más adelante quieres cambiar tu contraseña por seguridad (no por obligación), el sistema sí te pedirá:
- Tu contraseña **actual** (verificación de identidad).
- La nueva contraseña.
- La confirmación.

---

## 3. Flujo del Administrador

### Panel principal (Dashboard)

Después de iniciar sesión, el administrador entra al dashboard del sistema. Desde ahí puede acceder a los módulos:
- **Gestión de Usuarios**
- **Gestión de Vehículos**
- **Catálogo del chequeo** (preguntas, ítems y categorías)
- **Chequeos realizados** (con detalle, fotos e intentos bloqueados)
- *(Próximamente, Fase 5)* **Bandeja de alertas y notificaciones**

### Gestión de Usuarios

Permite administrar todos los usuarios del sistema (conductores y otros administradores).

**Crear un usuario nuevo:**
1. Click en **+ Crear usuario** (botón verde arriba).
2. Llena el formulario:
   - Nombre completo (obligatorio).
   - Cédula (obligatorio, no editable después).
   - Correo electrónico (obligatorio).
   - Teléfono (opcional).
   - Foto del usuario (opcional, máx 5 MB).
   - Rol (Conductor o Administrador).
   - Si es Conductor: datos de licencia (número, categoría, fecha de vencimiento).
3. El sistema genera automáticamente una **contraseña temporal**.
4. Al guardar, aparece un modal con la contraseña temporal y un botón **Copiar al portapapeles** para que se la entregues al usuario nuevo.

**Editar un usuario:**
1. En la tabla, click en **Editar** del usuario.
2. Cambia los datos que necesites (la cédula y el correo no son editables por seguridad).
3. Click en **Guardar cambios**.

**Otras acciones:**
- **Desactivar**: el usuario ya no puede iniciar sesión pero queda su historial.
- **Reactivar**: vuelve a habilitar la cuenta.
- **Resetear contraseña**: genera una nueva contraseña temporal.
- **Eliminar**: borra el usuario permanentemente (con confirmación).

### Gestión de Vehículos

Permite administrar la flota completa del centro.

**Vista de listado:**
- Cards visuales con foto, placa, marca/modelo y estado actual.
- Filtros por estado, tipo de vehículo y búsqueda por placa.
- Cards de estadística clickeables (Total, Operativo, Observación, Alerta, Crítico, No operativo, Inactivos) que filtran al hacer click.
- Botón de **Refrescar** con auto-refresh cada 30 segundos.

**Crear un vehículo:**
1. Click en **+ Crear vehículo**.
2. Llena los datos: placa, marca, línea/modelo, tipo, año, VIN, color, kilometraje.
3. Vencimientos: SOAT, RTM, extintor, último cambio de aceite.
4. Estado y nivel de criticidad (vinculados automáticamente con un slider de colores).
5. Subir fotos del vehículo (mínimo 1, máx 5 MB cada una). La primera se marca como principal.
6. Subir el archivo RUNT en PDF (máx 20 MB).
7. Notas y observaciones (opcional).
8. Click en **Crear vehículo**.

**Ver detalle de un vehículo:**
1. En el listado, click en **Detalle** de una card.
2. Vas a la página completa con: foto grande, datos básicos, documentación con fechas, ubicación del centro, notas, galería de fotos navegable (click en una foto abre el visor Lightbox con flechas y zoom) y visor del RUNT embebido en PDF.

**Editar un vehículo:**
1. Desde el listado o la vista detalle, click en **Editar**.
2. Cambia lo que necesites.
3. Acciones rápidas: marcar foto como principal, eliminar foto, reemplazar el RUNT.
4. Click en **Guardar cambios**.

### Catálogo del chequeo

Permite al administrador gestionar el contenido del chequeo preoperacional (preguntas, ítems y categorías) sin necesidad de modificar la base de datos directamente.

**Acceso:** Dashboard → **Catálogo del chequeo** (`/admin/catalogo`).

La pantalla tiene 3 pestañas en la parte superior:

**Pestaña Categorías:**
- Lista de las 5 categorías oficiales del checklist (Niveles, Pedales, Luces, Seguridad Vial, Varios) con su ícono visual.
- Botón **"+ Nueva categoría"**: abre un formulario con nombre (se escribe en mayúsculas automáticamente), descripción, orden y un **selector visual de íconos** (puedes escribir cualquier emoji a mano, elegir de la grilla sugerida, o dejar sin ícono).
- Cada categoría tiene botones **"Editar"** y **"Eliminar"**.

**Pestaña Ítems del checklist:**
- Lista de los 39 ítems oficiales agrupados por categoría.
- Botón **"+ Nuevo ítem"**: formulario con la categoría (dropdown), descripción corta, descripción larga opcional, orden, checkbox **"Marcar como CRÍTICO"** (los críticos bloquean el vehículo si se marcan como NO CUMPLE), y checkboxes para definir si aplica al chequeo preoperacional, postoperacional o ambos.
- Cada ítem editable y eliminable.

**Pestaña Preguntas de aptitud:**
- Las 5 preguntas sobre el estado físico y mental del conductor.
- Crear, editar y eliminar.
- Para cada pregunta se define cuál es la respuesta apta (SÍ o NO), porque algunas preguntas son afirmativas y otras negativas (por ejemplo "¿Descansó lo suficiente?" la apta es SÍ; "¿Tomó medicamentos que dan sueño?" la apta es NO).

**Eliminación inteligente:**
- Si la categoría, ítem o pregunta **nunca se ha usado** en un chequeo real, se elimina permanentemente de la base de datos.
- Si **ya tiene historial** (algún chequeo la respondió), se desactiva nada más para no romper los chequeos anteriores. El admin puede reactivarla después editándola.
- El modal de confirmación explica este comportamiento antes de confirmar.

**Nota importante:** los cambios se aplican **inmediatamente** en la app del conductor. Si agregas un ítem nuevo, el próximo conductor que abra el checklist lo verá.

### Chequeos realizados (lista)

Acceso: Dashboard → **Chequeos realizados** (`/admin/chequeos`).

Lista de todos los chequeos que los conductores han realizado, visibles según la jerarquía del administrador (un admin de centro ve solo los chequeos de su centro, un admin regional ve todos los centros de su regional, etc.).

**Filtros disponibles:**
- **Fecha desde / Fecha hasta:** rango de fechas.
- **Placa:** búsqueda libre, tolerante a espacios y mayúsculas (`ABC 123`, `abc123`, `ABC-123` matchean igual).
- **Estado del resultado:** Operativo, Observación, Alerta, Crítico, No operativo o "Todos".
- **Solo oficiales:** filtra los rechequeos del mismo día sobre el mismo vehículo (deja solo el chequeo principal).
- **Solo cerrados:** filtra los chequeos que el conductor empezó pero no terminó (deja solo los finalizados con resultado).
- Botón **Limpiar filtros** para resetear todo.

**Cada chequeo se ve como una tarjeta** con borde izquierdo del color del estado (verde, azul, amarillo, rojo, gris oscuro), con la placa grande, marca y línea del vehículo, conductor con CC, fecha y hora, badges de tipo (PRE/POST) y carácter (OFICIAL/RECHEQUEO/CERRADO), y los conteos cumple/no cumple/N/A.

Click en cualquier tarjeta abre el **detalle completo del chequeo**.

### Detalle de un chequeo

Acceso: desde la lista, click en cualquier card; o ruta directa `/admin/chequeos/:id`.

**Secciones de la pantalla:**

1. **Resultado y resumen** (arriba, con fondo de color según semáforo): badge del estado del vehículo (Operativo / Observación / Alerta / Crítico / No operativo), tipo de chequeo, fecha de inicio y cierre, kilometraje registrado, conteos cumple/no cumple/N/A y badge especial si hubo falla crítica.
2. **Vehículo:** foto principal, placa, marca, línea, año, tipo, color, VIN, estado actual del vehículo. Botón **"Ver ficha completa del vehículo →"** para abrir el detalle desde la sección de vehículos.
3. **Conductor:** foto, nombre completo, cédula, teléfono, datos completos de la licencia (número, categoría, vencimiento).
4. **Aptitud personal:** las 5 preguntas con un círculo verde con ✓ si la respuesta fue apta, o rojo con ✕ si no fue apta. Se ve la respuesta del conductor y cuál era la apta.
5. **Checklist del vehículo:** los ítems agrupados por categoría con cabecera verde y el ícono. Cada ítem muestra su descripción, badge CRÍTICO si aplica, estado (Cumple/No cumple/N/A), la observación del conductor (en bloque rosa si fue No cumple) y la grilla de fotos de evidencia si las hay.
6. **Notas generales** (si las hay): texto libre del conductor.

**Sobre las fotos:** cada foto es una tarjeta con la imagen + un botón debajo:
- **"Preservar siempre"** (texto morado): marca la foto como protegida del borrado automático. Útil cuando la foto es evidencia de un reclamo o auditoría en curso.
- Si ya está preservada: cambia a **"Quitar preservar"** y aparece un badge morado **"PRESERVADA"** en la esquina superior izquierda de la foto.
- Click en la foto la abre en una pestaña nueva en tamaño completo.

### Intentos bloqueados

Acceso: desde la lista de chequeos, botón **"Intentos bloqueados"** arriba a la derecha; o ruta directa `/admin/chequeos/intentos-bloqueados`.

Lista de todos los intentos de iniciar un chequeo que el sistema rechazó, registrados automáticamente para auditoría y notificación al administrador.

**Hay 3 razones de bloqueo:**

| Razón | Color | Cuándo se dispara |
|---|---|---|
| **Conductor no apto** | Rojo | El conductor respondió que no estaba en condiciones para conducir en alguna de las 5 preguntas de aptitud |
| **Vehículo desactivado** | Naranja | El conductor intentó usar un vehículo que el admin tiene desactivado |
| **Vehículo no encontrado** | Morado | El conductor intentó usar un vehículo que no existe o que pertenece a otro centro |

**Filtros:** fecha desde/hasta, razón del bloqueo, **"Solo pendientes de notificar"** (muestra solo los intentos sobre los que el admin todavía no recibió notificación).

**Cada intento aparece como una tarjeta** con borde izquierdo del color, frase explicativa, conductor + CC, vehículo (o "Sin vehículo seleccionado" si fue por aptitud), fecha y hora, y badge "NOTIFICADO" (verde) o "PENDIENTE DE NOTIFICAR" (amarillo).

---

## 4. Flujo del Conductor

### Dashboard del conductor

Después de iniciar sesión, el conductor ve una pantalla simple optimizada para celular:
- Saludo personalizado: *"Hola, [tu nombre]"*.
- Dos botones grandes:
  - **Iniciar chequeo preoperacional** (verde) — antes de salir con el vehículo.
  - **Chequeo post-operacional** (blanco con borde) — al regresar del recorrido.

### Cómo hacer un chequeo preoperacional

El flujo completo del conductor está implementado y disponible. Consta de 4 pasos:

#### Paso 1 — Aptitud personal ✅ (ya implementado)

1. Pulsa **Iniciar chequeo preoperacional** (círculo verde) desde tu dashboard.
2. El sistema te muestra **5 preguntas, una por pantalla**, sobre tu estado físico y mental (cansancio, medicamentos, alcohol, etc.).
3. En cada pregunta tienes dos botones grandes: **SÍ** (verde) y **NO** (con borde rojo).
4. Cuando seleccionas una respuesta, aparece un **modal de confirmación** preguntándote *"¿Tu respuesta es SÍ/NO?"*. Esto es a propósito: evita que un toque accidental en la pantalla del celular registre una respuesta equivocada.
   - Si te equivocaste, pulsa **Volver atrás**.
   - Si está bien, pulsa **Sí, confirmar** y pasas a la siguiente pregunta.
5. En la parte superior verás una **barra de progreso** que indica en qué pregunta vas (por ejemplo: "3 DE 5").
6. Si **todas tus respuestas son aptas**, el sistema te lleva al siguiente paso (selección de vehículo).
7. Si **alguna respuesta indica que no estás apto** (por ejemplo, "Sí, tomé medicamentos que dan sueño"), el sistema:
   - Te muestra una **pantalla de bloqueo en rojo** que dice "No estás en condiciones aptas".
   - Lista cuál o cuáles preguntas no fueron aptas, para que sepas claramente el motivo.
   - **Notifica automáticamente al administrador** que hubo un intento bloqueado.
   - Te ofrece un botón **Volver al inicio**.

> **Recomendación:** responde siempre con honestidad. La aptitud personal protege tu vida, la de los demás conductores y los recursos del SENA. Un "no apto" no es un castigo, es una pausa preventiva.

#### Paso 2 — Selección de vehículo ✅ (ya implementado)

1. Si todas las preguntas de aptitud fueron aptas, el sistema te lleva a la pantalla de **Selección de vehículo**.
2. Ves un **buscador por placa** en la parte de arriba (puedes escribir las primeras letras, ej: "OCJ").
3. Debajo aparece la **lista de vehículos disponibles de tu centro**. Cada vehículo se muestra como una tarjeta con:
   - La **placa** grande.
   - **Marca, línea y año**.
   - Una **etiqueta de color** con el estado actual (Operativo en verde, Observación en azul, Alerta en amarillo, Crítico en rojo, No operativo en gris oscuro).
   - El **último kilometraje** registrado.
4. Toca la tarjeta del vehículo que vas a usar. Aparece un **modal de confirmación** con:
   - Resumen del vehículo seleccionado.
   - Campo para ingresar el **kilometraje actual** (precargado con el último registrado).
   - Botones: *Volver atrás* / *Iniciar chequeo*.
5. Valida que el kilometraje no sea menor al registrado (no se puede "retroceder").
6. Al confirmar, el sistema crea el chequeo en la base de datos y te lleva al paso siguiente (la lista de 39 ítems).

> **Importante:** solo verás los vehículos **activos de tu centro**. Si necesitas usar un vehículo de otro centro o un vehículo desactivado, contacta al administrador.

#### Paso 3 — Lista de chequeo de 39 ítems ✅ (ya implementado)

1. La lista está organizada en **5 categorías**: Niveles, Pedales, Luces, Seguridad Vial, Varios. **Ves una categoría a la vez** (5 pantallas en total).
2. En la parte de arriba ves una **barra de 5 bloques** que indica en qué categoría vas (verde oscuro = actual, verde claro = ya completada, gris = pendiente).
3. Cada ítem se muestra como una **tarjeta** con:
   - Descripción corta y, debajo, una descripción más larga (si aplica).
   - Tres botones grandes: **Cumple** (verde), **No cumple** (rojo), **N/A** (gris).
   - Si el ítem es **crítico** (afecta directamente la seguridad), aparece un **badge rojo "CRÍTICO"** al lado.
4. Cuando marcas **No cumple**, aparece automáticamente un cuadro de texto debajo para la **observación obligatoria** (no puedes seguir sin escribirla). Allí describes qué está mal.
5. Cuando termines todos los ítems de la categoría, pulsa **Siguiente →**. El sistema guarda automáticamente tus respuestas en la base de datos antes de pasar a la siguiente categoría.
6. Si te falta marcar algo o falta una observación, el sistema te muestra un mensaje rojo arriba de los botones y no te deja avanzar.
7. Puedes ir hacia atrás con el botón **← Anterior** en cualquier momento.
8. En la **última categoría**, el botón cambia a **Finalizar chequeo** (en naranja). Al pulsarlo, aparece un modal de confirmación recordándote que ya no podrás editar.

> **Importante:** las respuestas se guardan en tu navegador automáticamente. Si por algún motivo cierras la página o se recarga, **al volver entrar al chequeo sigues desde donde ibas** (no pierdes lo que ya respondiste). Pero ojo: para que queden registradas oficialmente en el sistema, debes pulsar **Siguiente** o **Finalizar**.

#### Adjuntar fotos de evidencia ✅ (ya implementado)

Cuando marcas un ítem como **No cumple** y escribes la observación, aparece debajo la sección **"Evidencia fotográfica (opcional)"** con dos botones:

- **"Tomar foto"** (verde sólido): en celular abre la **cámara nativa** directamente. En computador abre el selector de archivos.
- **"Subir foto"** (blanco con borde verde punteado): siempre abre el selector de archivos / galería.

**Reglas y límites:**
- Máximo **3 fotos por ítem**.
- Formatos aceptados: JPG, PNG, WebP (y cualquier formato que la cámara del celular produzca — el sistema lo convierte automáticamente).
- Las fotos se **comprimen automáticamente** en el celular antes de subir (las cámaras modernas producen 5-8 MB, después de comprimir quedan en 500 KB - 1 MB sin pérdida visible). Esto hace que subir sea mucho más rápido con datos móviles.
- Solo aparece el botón cuando escribiste al menos 5 caracteres de observación (porque la observación es la descripción del problema y la foto es la evidencia).
- Mientras sube ves "Subiendo foto..." y los botones quedan deshabilitados.

**Eliminar una foto:** click en el **círculo rojo con X** en la esquina superior derecha de la previsualización. El sistema pide confirmación antes de eliminar.

**Si cambias de opinión:** si tienes fotos subidas y cambias el ítem de "No cumple" a otro estado (Cumple o N/A), el sistema te avisa que se eliminarán las fotos y pide confirmación. Si aceptas, las borra automáticamente.

**Qué hace el SENA con las fotos:** se conservan automáticamente **12 meses** desde que se subieron. Después se borran solas para liberar espacio. Si el administrador necesita guardar una foto específica para una reclamación, una auditoría o un caso especial, puede marcarla como **"Preservar siempre"** desde la pantalla de detalle del chequeo, y esa foto ya no se borra automáticamente.

#### Paso 4 — Resultado del chequeo ✅ (ya implementado)

Después de finalizar, el sistema calcula automáticamente el estado del vehículo y te lleva a una **pantalla de resultado a color**:

| Estado | Color | Significado |
|---|---|---|
| **OPERATIVO** | Verde | Puedes salir sin restricciones. |
| **OBSERVACIÓN** | Azul | Detalles menores. Puedes operar pero repórtalo. |
| **ALERTA** | Amarillo | Varias fallas. Reporta antes de operar. |
| **CRÍTICO** | Rojo | Fallas graves. **Se recomienda no operar.** |
| **NO OPERATIVO** | Gris oscuro | **NO PUEDES operar el vehículo.** Hay falla crítica o demasiadas fallas. |

En la pantalla verás:
- **Tarjeta principal**: el estado con un ícono dentro de un círculo de color y un texto que te explica qué hacer.
- **Resumen del chequeo**: cuántos ítems marcaste Cumple, No cumple y N/A.
- **Alerta de críticos**: si hubo ítems críticos fallados, aparece un bloque rojo destacado con el número.
- **Datos del vehículo**: la placa grande y el tipo de chequeo (pre/post).
- **Aviso de actualización**: si el sistema actualizó el estado del vehículo automáticamente (porque el resultado es peor), te lo dice.
- **Aviso de sugerencia**: si el resultado del vehículo es **mejor** que su estado anterior, el sistema envía una sugerencia al administrador para revisar y actualizar manualmente. A ti se te informa para que sepas que tu chequeo aportó esa mejora.
- **Botón "Volver al inicio"**: te lleva de vuelta a tu dashboard de conductor.

> **NO OPERAR EL VEHÍCULO**: si el resultado es Crítico o No operativo, la pantalla muestra una franja roja gigante con ese mensaje. El administrador ya fue notificado automáticamente.

### Cómo hacer un chequeo post-operacional

Al regresar de un recorrido, repites el mismo proceso pero seleccionando **Chequeo post-operacional** en el dashboard. Esto sirve para comparar el estado del vehículo antes y después del uso.

### Reglas importantes

- **Solo puedes operar vehículos de tu centro** asignado.
- **No puedes usar un vehículo desactivado** por el administrador. Si lo intentas, el sistema te bloquea y notifica al admin.
- **El primer chequeo del día** se marca como "oficial". Los siguientes del mismo día son rechequeos (útiles si hubo reparación a mediodía).
- **Las fotos de evidencia** se conservan automáticamente por 12 meses. El administrador puede marcarlas como "preservar siempre" si son importantes.

---

## 5. Cerrar sesión

En la esquina superior derecha de cualquier pantalla (admin o conductor), pulsa el botón **Cerrar sesión**.

Por seguridad:
- Tu sesión tiene una duración limitada. Si pasa mucho tiempo sin actividad, el sistema te puede sacar automáticamente.
- Siempre cierra sesión en computadores compartidos.

---

## 6. Solución de problemas comunes

### No puedo iniciar sesión

- Verifica que el correo o cédula estén bien escritos.
- Verifica la contraseña (puede haber mayúsculas o minúsculas activadas que no notas).
- Si te equivocas 5 veces, espera 15 minutos antes de reintentar.
- Si olvidaste la contraseña, contacta al administrador para que te genere una nueva.

### La página se ve incompleta o con errores

- Asegúrate de tener conexión a internet estable.
- Refresca la página con `Ctrl + F5` (recarga forzada).
- Si sigues teniendo problemas, cierra el navegador completo y vuelve a entrar.

### Subí una foto y no aparece

- Verifica que el archivo sea menor a 5 MB.
- Verifica que sea JPEG, PNG o WebP.
- Espera unos segundos: las fotos pueden tardar en cargarse la primera vez.

### El sistema me sacó automáticamente

- Tu sesión expiró por inactividad. Vuelve a iniciar sesión.
- Si pasa frecuentemente, verifica que tu equipo tenga la hora correcta.

### "No tienes centro asignado" (conductor)

- Tu cuenta no tiene un centro de formación asignado. Contacta al administrador para que te lo asigne.

---

## Convención de actualización

Este manual se actualiza cuando:
- Se agrega una nueva pantalla o funcionalidad importante visible al usuario.
- Se cambia el flujo de uso de algo ya existente.
- Se identifica un problema común que merece estar en la sección de troubleshooting.

**No se actualiza** cuando hay cambios técnicos invisibles al usuario (refactors, optimizaciones, bug fixes que no afectan el uso).
