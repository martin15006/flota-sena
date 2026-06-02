# Contexto del Proyecto — Sistema de Gestión de Flota Vehicular SENA

> **Archivo maestro de contexto.** Acumula toda la información importante del dominio, decisiones tomadas, reglas de negocio y **lo que ya está hecho**. Diseñado para servir como fuente de verdad entre sesiones y para que cualquier persona (humano o IA) que retome el proyecto tenga todo lo necesario sin tener que volver a preguntar.
>
> **Última actualización:** 30 de mayo de 2026 (cierre de Fase 2, inicio de Fase 3)
>
> **Cómo usarlo:**
> - **Mantener actualizado** al cerrar cada fase o al tomar decisiones nuevas.
> - **No borrar** la información obsoleta — **tacharla** y reemplazarla, así queda historia.
> - **Marcar lo terminado** con ✅ para ver el estado real del proyecto de un vistazo.
> - Si entra una IA nueva a la conversación, este archivo es lo primero que debería leer.

---

## 0. ¿Qué es este proyecto? (resumen ejecutivo)

**En una frase:** Un sistema digital de **check list preoperacional** que genera **notificaciones automáticas** al administrador cuando un vehículo no está apto para operar o cuando un conductor no está en condiciones de manejar.

**El flujo central** (de principio a fin):
1. El **conductor** llega al patio del SENA, abre la app en su celular, hace login.
2. Antes de cualquier acción, responde **5 preguntas de aptitud personal** (descanso, medicamentos, mareo, alcohol, estado emocional). Si no está apto → bloqueo + notificación al admin.
3. Si pasa, **busca el vehículo** que va a operar por placa y confirma.
4. Llena un **check list de 39 ítems** sobre el estado del vehículo (frenos, luces, llantas, kit de seguridad, etc.). Cada ítem es **Cumple / No cumple / N/A** y los críticos disparan bloqueo.
5. Al finalizar, el sistema **calcula el estado** del vehículo (5 niveles: Operativo / Observación / Alerta / Crítico / No operativo) y dispara notificaciones al admin si aplica.
6. El **administrador** recibe las alertas en tiempo real (campanita + correo) y decide qué hacer: autorizar, bloquear, asignar mantenimiento, etc.
7. Al regresar del recorrido, el conductor llena el **mismo check list como post-operacional** para detectar fallas que aparecieron durante el uso.
8. Cada 8 días (configurable) el sistema envía **reporte automático por correo** al admin con el consolidado de la flota.

**Para qué sirve todo esto:**
- **Mejorar la trazabilidad** de la flota (hoy es 100% papel).
- **Reducir riesgos** operativos (4 de 9 vehículos están en estado crítico hoy).
- **Prevenir incidentes** mediante alertas tempranas (vencimientos de SOAT, RTM, extintor, licencia).
- **Cumplir normativa** del kit de seguridad vial (100% de la flota está incumpliendo hoy).

**Meta de entrega:** Pasar de TRL 6 (prototipo en localhost) a **TRL 7** (validación en patio real con conductor real y un vehículo real — el tractocamión Mack Vision OCJ 453).

---

## ⚠️ Advertencia: datos obsoletos del HTML de requerimientos

El archivo `Requerimientos_Sistema_Flota_SENA.html` que el SENA entregó en mayo 2026 era la primera versión. **Algunos datos están desactualizados** porque el alcance del proyecto se amplió en sesiones posteriores. Las desviaciones intencionales son:

| Lo que dice el HTML | Lo que se decidió hacer |
|---|---|
| Solo 2 roles: Admin + Conductor | **6 roles** en jerarquía multinivel (ver sección 7) |
| Semáforo de 3 colores: 🟢🟡🔴 | **5 estados:** Operativo / Observación / Alerta / Crítico / No operativo (ver sección 12) |
| "Fuera de Servicio" cuando hay falla crítica | Se traduce a **"No operativo"** + bloqueo del vehículo |
| Stack con TailwindCSS | **CSS modular puro** con variables (Tailwind descartado por preferencia) |
| Stack con PostgreSQL puro + Socket.io | **Supabase** (PostgreSQL + Realtime + Auth, todo integrado) |

Los datos institucionales del HTML (5 preguntas de aptitud, 39 ítems del checklist, reglas de fallas críticas, política de contraseñas, frecuencia de reportes, etc.) **siguen siendo válidos** y son los que aparecen en este archivo.

---

## 0.1 Estado actual del proyecto

### ✅ Lo que YA está hecho

**Fase 0 — Fundación** (cerrada)
- Estructura del repo, frontend con Vite, backend con Express, Supabase conectada

**Fase 1 — Autenticación** (cerrada)
- Login con correo o cédula, JWT, bcrypt
- Cambio obligatorio de contraseña en primer login
- ProtectedRoute, AuthContext con persistencia
- CRUD completo de usuarios (admin)

**Fase 2 — Gestión de vehículos** (cerrada — commit `d54a7b4`)
- 10 vehículos del SENA Tolima registrados con datos coherentes
- CRUD admin con auditoría, multi-tenant por `centro_id`
- Upload de fotos múltiples + RUNT en PDF (visor inline)
- Modal unificado crear/editar con slider Estado/Criticidad sincronizado
- Vista de detalle con galería Lightbox y visor PDF embebido
- Componente Toast reutilizable, manejo global de sesión expirada
- Keep-alive Supabase como parche temporal

**Infraestructura base de Fase 3** (ya creada en BD)
- Tablas geográficas (regiones, departamentos, ciudades, centros) cargadas con Colombia completa
- Estructura de 5 niveles de admin en la BD lista (pendiente UI)

**Diseño SQL de Fase 3** (ejecutado en Supabase, 100% funcionando)
- ✅ Carpeta `database/` creada en la raíz del repo con `README.md` + `database.sql` + `seeds/`
- ✅ 9 tablas nuevas creadas: catálogos (categorías, items, preguntas), chequeos + respuestas, fotos del chequeo, intentos bloqueados, auditoría
- ✅ 2 triggers automáticos (`updated_at` y cálculo de `fecha_borrado_programado` de fotos)
- ✅ 11 índices orientados a queries reales
- ✅ Seeds: 5 categorías, 39 ítems (con 6 críticos marcados), 5 preguntas de aptitud
- ✅ RLS deshabilitado en las 19 tablas del proyecto (BUG-008 resuelto)

**Backend de Fase 3** (8 endpoints funcionando, probados end-to-end)
- ✅ Middlewares de roles ampliados: `requiereRol`, `soloAdmin` (5 niveles), `soloConductor`, `adminOConductor`
- ✅ `GET /api/chequeos/catalogo` — categorías + ítems + preguntas en una llamada
- ✅ `GET /api/chequeos/vehiculos-disponibles?busqueda=...` — solo conductor, con búsqueda por placa
- ✅ `POST /api/chequeos/iniciar` — valida aptitud + vehículo, crea cabecera con `es_oficial` automático, registra intentos bloqueados con razón específica
- ✅ `PUT /api/chequeos/:id/respuestas` — guarda 1 a 39 respuestas en lote con upsert por (chequeo_id, item_id), valida observación obligatoria en NO CUMPLE
- ✅ `POST /api/chequeos/:id/cerrar` — calcula resultado por tabla de semáforo, detecta falla crítica, actualiza estado del vehículo SOLO si es peor, devuelve sugerencia al admin si es mejor
- ✅ `GET /api/chequeos` (admin) — lista con filtros (fecha, placa, estado, oficiales, cerrados) y paginación, scope por jerarquía
- ✅ `GET /api/chequeos/:id` (admin) — detalle completo con respuestas + aptitud + vehículo + conductor + fotos
- ✅ `GET /api/chequeos/intentos-bloqueados` (admin) — logs de intentos rechazados con scope

**Refuerzo de infraestructura**
- ✅ Keep-alive Supabase ahora es bloqueante al arrancar (previene primera petición fría)
- ✅ Mensaje de error de aptitud mejorado con detalle de qué pregunta exacta falló

### 🔄 Lo que está EN CURSO (Fase 3)

- Backend: endpoints de fotos de evidencia del chequeo (POST/DELETE/PATCH) — Bloque 3
- Cron job mensual de borrado de fotos vencidas (preservar_siempre = false, fecha_borrado_programado < NOW())
- Frontend del conductor: login diferenciado + 5 preguntas + selección vehículo + checklist + resultado
- Frontend del conductor: chequeo post-operacional (mismo formulario, distinto tipo)
- Frontend del admin: vista de chequeos con filtros + detalle + intentos bloqueados

### ⏳ Lo que VIENE después de Fase 3

- **Fase 4** — Dashboard del admin: semáforo, historial, alertas
- **Fase 5** — Notificaciones: campanita en sitio (Supabase Realtime) + correo (Nodemailer)
- **Fase 6** — Reportes: exportación Excel/PDF, envío automático cada 8 días
- **Fase 7** — Vencimientos automáticos: SOAT, RTM, extintor, licencia
- **Fase 8** — Validación TRL 6 → TRL 7 con conductor real en patio

---

## 1. Identidad del proyecto

| Campo | Valor |
|---|---|
| Nombre | Sistema de Gestión de Flota Vehicular SENA |
| Organismo | SENA Regional Tolima — Centro de Industria y Construcción |
| Programa | ID+I (Investigación, Desarrollo e Innovación) / SENNOVA |
| Desarrollador | Juan Sebastián Martín Moncada |
| Plazo del MVP | 1 mes (mayo 2026) |
| Repositorio | https://github.com/martin15006/flota-sena |
| Meta | TRL 6 → TRL 7 (validación en patio de maniobras con conductor real) |

---

## 2. Stack técnico definitivo

| Capa | Tecnología | Notas |
|---|---|---|
| Frontend | React 19 + Vite + React Router 7 | CSS modular separado por componente, **sin Tailwind** (el HTML original lo proponía pero el equipo lo descartó por preferencia), variables CSS propias |
| Backend | Node.js 24 + Express 5 + Multer | |
| Base de datos | Supabase (PostgreSQL cloud) | `service_role_key` en backend bypasea RLS |
| Autenticación | Supabase Auth | Tokens access ~1h, refresh disponible. Hash con bcrypt interno. |
| Storage de archivos | Cloudinary | 25 GB gratis. Fotos como `image`, RUNT como `image` + `format: pdf` |
| Tiempo real | Supabase Realtime | Para notificaciones al admin (Fase 5) |
| Correo | Nodemailer | Envíos automáticos cada 8 días por defecto (Fase 5) |
| Backups | `pg_dump` + `node-cron` | Diario, retención 30 días en disco local |

---

## 3. Definición TRL 6 y TRL 7 (qué se entrega)

**TRL 6 — Prototipo validado en entorno simulado:**
- Sistema completo integrado: interfaz del conductor, alertas en tiempo real, panel admin.
- Se ejecuta en `localhost` simulando ingreso de datos por un conductor.
- Verifica respuesta de alertas por correo y bloqueos end-to-end.

**TRL 7 — Prototipo demostrado en entorno operativo real (hito crítico):**
- El software sale del computador del dev y se despliega en patio de maniobras del SENA Tolima.
- Se entrega la app en un **dispositivo móvil** a un conductor real para evaluar uno de los vehículos de la flota (ej. el tractocamión Mack Vision **OCJ 453**) antes de su ruta.
- Condiciones reales: poca señal, sol directo, usabilidad con manos de operario.

**Hipervínculo Inteligente al RUNT:** plus del sistema. Botón de acceso directo a la plataforma oficial del RUNT para consulta rápida de antecedentes y vigencia de SOAT/RTM sin salirse del formulario preoperacional. **Ya implementado en Fase 2.**

---

## 4. Identidad visual e institucional

| Elemento | Valor |
|---|---|
| Color corporativo principal | **Verde SENA `#39A900`** |
| Colores complementarios | Blanco y grises oscuros para contraste |
| Logos | SENA verde (logoverde.png), ICI, SENNOVA — en `public/` |
| Prioridad UX | Alto contraste y legibilidad en dispositivos móviles (conductores trabajan al sol) |

**Regla:** la UI del conductor (móvil) y la del admin (escritorio) deben alinearse al **Manual de Imagen Institucional del SENA**.

---

## 5. Política de seguridad

### Contraseñas
- **Mínimo 8 caracteres** para todos los usuarios.
- **Conductor**: estructura numérica o alfanumérica simple (desbloqueo rápido en campo).
- **Admin**: complejidad alta (mayúsculas + números + caracteres especiales).
- **Cambio obligatorio** en primer login después de creación por admin (✅ ya implementado).
- **Hash con bcrypt** (manejado por Supabase Auth).

### Bloqueos
- **5 intentos fallidos** → suspensión temporal de **15 minutos**.
- Panel admin tendrá función de **blanqueo/reinicio manual** de claves.

### Sesiones
- **JWT con expiración fija de 12 horas** según el PDF de requerimientos.
- ⚠️ **Realidad actual:** Supabase Auth devuelve access token con ~1h. El `refresh_token` está disponible pero no se está usando en el frontend. Es una desviación a confirmar con SENA o implementar el refresh.

---

## 6. Estrategia de respaldos

- **Entorno:** local y aislado, gestión propia (no depende de Dirección General).
- **Implementación:** `node-cron` ejecuta `pg_dump` diario.
- **Retención:** 30 días cíclicos en directorio seguro del servidor.
- **Estado:** ⏳ Pendiente de implementar (probablemente Fase 6 o 8).

---

## 7. Arquitectura multi-tenant (jerarquía nacional)

Aprobada en Fase 2 bajo la estrategia **"Arquitectura Nacional, MVP de Centro"**:

| Nivel | Rol | Alcance | Notas |
|---|---|---|---|
| 1 | **SuperAdmin Nacional** | Gestiona admins regionales, reportes consolidados | BD lista, UI en fase posterior |
| 2 | **Admin Regional** | 5 regiones SENA (Andina, Caribe, Pacífica, Amazónica, Orinoquía) | BD lista, UI en fase posterior |
| 3 | **Admin Departamental** | 32 departamentos | BD lista, UI en fase posterior |
| 4 | **Admin Ciudad** | Todas las ciudades, incluso con un solo centro | BD lista, UI en fase posterior |
| 5 | **Admin Centro** | Vehículos + conductores + chequeos | ✅ **Funcionando en MVP** |

**Centro inicial del MVP:** Centro de Industria y Construcción (Tolima) → `centro_id = b99023b0-2d47-4754-a085-8facfc11c93a`

---

## 8. Flota actual (10 placas)

| Placa | Tipo | Marca/Línea | Año | Estado | Criticidad | Notas relevantes |
|---|---|---|---|---|---|---|
| OCJ 441 | Camión | Hyundai HD 270 | 2009 | Alerta | 55% | Luz lateral fundida, kit incompleto |
| OCJ 442 | Camión | Hyundai HD 270 | 2009 | Crítico | 70% | Frenos largos (riesgo colisión) |
| OCJ 451 | Camioneta | Ford Ranger | 2011 | Alerta | 40% | Aceite mal estado, faltan accesorios |
| OCJ 453 | Tractocamión | Mack Vision | 2007 | Crítico | 85% | Aula móvil de confección, brutal estado |
| OJX 371 | Microbús | Renault Master | 2015 | Crítico | 85% | Sin luces, plumillas malas |
| **OJX 793** | Buseta | Chevrolet NPR | 2016 | **No operativo** | 95% | **⚠️ ALERTA INSTITUCIONAL: opera sin batería propia (préstamo de otro centro). Frenos críticos, sin luces.** Caso documentado en PDF de requerimientos del SENA. |
| OJY 101 | Camión | Mitsubishi Fuso FE85 | 2016 | Operativo | 15% | Mejor estado de la flota |
| OKL 210 | Camión | Hyundai HD 72 | 2009 | No operativo | 90% | 100% de fallas, sin tapa de radiador |
| PXS 700 | Bus | Chevrolet MS | 2026 | Observación | 25% | Vehículo nuevo, RTM exenta |
| ABC123 | Camioneta | Honda HD 270 | 2000 | Operativo | 0% | Vehículo de prueba creado en desarrollo |

**Vehículo de referencia para sustentación TRL 7:** Tractocamión Mack Vision **OCJ 453** (mencionado explícitamente en el PDF como caso de prueba).

---

## 9. Catálogo de chequeo preoperacional (39 ítems)

> Extraídos de los Excel "PLACA XXX.xlsx" + HTML `Requerimientos_Sistema_Flota_SENA.html`. Estos son los ítems que el **conductor** marca antes de operar el vehículo.

### Estados posibles de respuesta (3 botones)
- ✅ **CUMPLE** — Ítem en buen estado, no requiere observación.
- ❌ **NO CUMPLE** — Ítem en mal estado. **Se habilita automáticamente** campo de observaciones (obligatorio) + foto opcional.
- ➖ **N/A (No aplica)** — El ítem no aplica al tipo de vehículo (ej. cintas reflectivas en camioneta liviana).

### Datos adicionales que captura el formulario
- **Kilometraje actual** (numérico, obligatorio)
- **Fecha y hora** (automáticos)
- **Nombre del conductor** (automático del login)
- **Tipo de chequeo:** Preoperacional / Post-operacional

### Botón "Enviar reporte"
- Permanece **bloqueado hasta tener el 100% de los ítems respondidos**.
- Al enviar dispara validaciones automáticas (ver sección de fallas críticas).
- Genera notificación al administrador.

### 9.1 NIVELES (5 ítems)
1. Líquido refrigerante de radiador
2. Líquido de frenos
3. Aceite motor
4. Nivel líquido hidráulico
5. Agua de limpiavidrios

### 9.2 PEDALES (3 ítems)
6. Acelerador
7. Cluth (cloche / embrague)
8. Freno (agarre)

### 9.3 LUCES (7 ítems)
9. Luces (altas, medias, bajas)
10. Direccionales
11. Estacionarias
12. Stops (frenos)
13. Testigos del tablero
14. Luz de reversa
15. Luces internas

### 9.4 SEGURIDAD VIAL / KIT DE CARRETERA (8 ítems)
16. Extintor (BC - ABC)
17. Fecha de vencimiento del extintor
18. Cruceta acorde a los pernos
19. 2 señales reflectivas en triángulo con soporte
20. Caja de herramienta (alicate, destornilladores, llaves)
21. Linterna
22. Botiquín primeros auxilios (gasas, tapabocas, vendas, etc.)
23. Gato

### 9.5 VARIOS / ESTADO MECÁNICO Y ACCESORIOS (16 ítems)
24. Llantas (labrado 2 mm de profundidad y aire)
25. Batería (bornes, sin corrosión, sulfatación)
26. Rines (sin golpes ni fisuras)
27. Cinturón de seguridad en todos los puestos
28. Alarma reversa (vehículos operativos)
29. Pito
30. Freno de emergencia
31. Espejos laterales y cabina (sin fisuras)
32. Estado carcasa luces
33. Plumillas / limpiaparabrisas
34. Aire acondicionado *(aplica solo si el vehículo lo tiene)*
35. Panorámico (sin fisuras)
36. Puertas
37. Cintas reflectivas
38. Tapizado
39. **Llanta de repuesto**

### 🚨 Fallas críticas que bloquean automáticamente el vehículo

Si el conductor marca **"NO CUMPLE"** en cualquiera de estos ítems, el vehículo queda en estado **"Fuera de Servicio"** hasta que el admin lo libere manualmente:

- Sistema de frenos (cualquier sub-ítem: pedal del freno, freno de emergencia, líquido de frenos)
- Sistema de dirección
- Luces de stop (frenos)
- Luces altas / medias / bajas
- Direccionales

### Resultado del chequeo — 5 estados (NO el semáforo de 3 colores del HTML)

> ⚠️ **El HTML proponía un semáforo de 3 colores (Verde/Amarillo/Rojo).** En Fase 2 se decidió ampliar a **5 estados** con rangos de criticidad asociados (Opción D del vínculo Estado/Criticidad, ver sección 12). Esto da más granularidad para reportes y filtros.

| Estado | Color | Rango de criticidad | Descripción operativa |
|---|---|---|---|
| 🟢 **Operativo** | Verde SENA | 0% – 19% | Sin fallas. Autorizado a circular sin restricciones. |
| 🔵 **Observación** | Azul | 20% – 39% | Fallas cosméticas o vencimientos lejanos. Puede operar pero hay que mirarlo. |
| 🟡 **Alerta** | Amarillo | 40% – 59% | Fallas no críticas. Requiere mantenimiento próximo. |
| 🔴 **Crítico** | Rojo | 60% – 89% | Fallas graves. Riesgo si opera. Notificación al admin. |
| ⚫ **No operativo** | Gris oscuro | 90% – 100% | Equivalente al "Fuera de servicio" del HTML. **Bloqueado**, NO debe operar. Notificación urgente. |

**Cálculo automático del estado al cerrar el chequeo:**
- Si hay **al menos 1 ítem crítico marcado "NO CUMPLE"** → **No operativo** (90-100%).
- Si no hay críticos pero hay **muchos ítems no críticos en mal estado** → según cantidad: Crítico / Alerta / Observación.
- Si todos cumplen o son N/A → **Operativo**.

**Lógica fina aún por confirmar con coordinación SENA**: ¿cuántos ítems no críticos en mal estado bajan al estado siguiente? Propuesta razonable para arrancar: cada 4 ítems no críticos en mal estado = baja un nivel.

### Chequeo POST-operacional (al regresar del recorrido)
- El conductor llena el **mismo checklist** después del recorrido.
- Sirve para **comparar estado antes vs después** y detectar qué fallas aparecieron durante la operación.
- Mismo formato, distinto `tipo` en la BD (`preoperacional` vs `postoperacional`).

---

## 10. ✅ 5 preguntas iniciales al conductor (Paso 2: Autodeclaración de aptitud)

> Definidas en `Requerimientos_Sistema_Flota_SENA.html` (Paso 2 del flujo del conductor).
> Se hacen **apenas el conductor inicia sesión**, antes de cualquier acción.

| # | Pregunta | Respuesta esperada |
|---|---|---|
| 1 | ¿Descansó lo suficiente (mínimo 6–8 horas de sueño)? | Sí |
| 2 | ¿Se siente bajo el efecto de algún medicamento que cause somnolencia? | No |
| 3 | ¿Presenta mareo, visión borrosa o dolor de cabeza intenso? | No |
| 4 | ¿Ha consumido bebidas alcohólicas o sustancias psicoactivas en las últimas 24 horas? | No |
| 5 | ¿Se siente emocionalmente apto para conducir hoy? | Sí |

### Bloqueo automático por aptitud
Si **cualquier respuesta indica que el conductor NO está apto**, el sistema:

1. **Bloquea la continuación** del chequeo del vehículo.
2. **Muestra mensaje claro** al conductor.
3. **Notifica inmediatamente al administrador** (campanita + correo + sonido).
4. **Registra el intento fallido** en el historial del conductor (útil para detectar patrones de fatiga recurrente).

---

## 10.5 Roles del sistema y datos del conductor

> ⚠️ **El HTML original proponía solo 2 roles (Admin + Conductor).** En sesiones posteriores se decidió ampliar a **6 roles** en jerarquía multinivel para que el sistema escale a nivel nacional sin migrar datos. La BD ya tiene las tablas y enum de roles listas. Las UIs de los niveles superiores se construyen en fases posteriores.

### Los 6 roles del sistema

| # | Rol | Alcance | Estado UI |
|---|---|---|---|
| 1 | **`superadmin`** — Super Administrador Nacional | Gestiona admins regionales. Visibilidad total. Reportes consolidados nacionales. | ⏳ Pendiente |
| 2 | **`admin_regional`** — Administrador Regional | 5 regiones del SENA (Andina, Caribe, Pacífica, Amazónica, Orinoquía). Gestiona admins departamentales de su regional. | ⏳ Pendiente |
| 3 | **`admin_departamental`** — Administrador Departamental | 32 departamentos. Gestiona admins de ciudad de su departamento. | ⏳ Pendiente |
| 4 | **`admin_ciudad`** — Administrador de Ciudad | Todas las ciudades, incluso con un solo centro. Útil para Ibagué que tiene varios centros. | ⏳ Pendiente |
| 5 | **`admin_centro`** — Administrador de Centro (nivel operativo) | Gestiona vehículos, conductores y chequeos preoperacionales **de su centro**. Recibe notificaciones críticas en tiempo real. | ✅ **Funcionando en MVP** (UI lo llama "admin" a secas) |
| 6 | **`conductor`** — Operario de vehículo | Hace chequeos pre y post-operacionales del vehículo. No tiene acceso al panel admin. | ⏳ Pendiente (Fase 3) |

### Notas importantes
- **No hay autoregistro.** Los conductores son autorizados manualmente por el admin del centro.
- **No hay aprendices ni otros roles** con acceso al sistema.
- **Cualquier conductor puede usar cualquier vehículo** del centro (no hay asignación fija vehículo–conductor).
- **Estado actual en UI:** los enums están en BD, pero la UI solo expone `admin` y `conductor`. Los demás roles se exponen progresivamente cuando se construyan sus dashboards (Fases posteriores).
- ✅ **Confirmado el 30 de mayo de 2026:** Son **6 roles exactamente**, sin un 7º. La duda inicial era confusión, ya resuelto.

### Datos del conductor que maneja el sistema
- Nombre completo
- Cédula de ciudadanía
- Correo electrónico
- Teléfono
- Foto del conductor (subida por el administrador)
- **Licencia de conducción:** número, **categoría**, **fecha de vencimiento** *(MVP)*
- **EPS / ARL** *(Fase 2 — opcional)*

---

## 10.6 Notificaciones (3 canales en paralelo)

| Evento | Campanita | Correo | Sonido |
|---|---|---|---|
| Conductor no apto (bloqueo en aptitud) | ✅ | ✅ | ✅ |
| Vehículo bloqueado por falla crítica | ✅ | ✅ | ✅ |
| Chequeo finalizado sin fallas críticas | ✅ | — | — |
| Vencimiento próximo (SOAT, RTM, etc.) | ✅ | ✅ | — |

---

## 10.7 Alertas de vencimientos (cálculo automático)

| Documento / Item | Aviso |
|---|---|
| SOAT | 30, 15 y 5 días antes |
| RTM | 30, 15 y 5 días antes |
| Extintor | 30 días antes |
| Licencia del conductor | 30 días antes |
| Cambio de aceite (por kilometraje) | Configurable por tipo de vehículo |

---

## 10.8 Reportes y exportación

### Manuales (desde el panel admin)
- Exportar historial filtrado a **Excel**.
- Exportar historial filtrado a **PDF**.
- Reporte individual de chequeo (formato similar al Excel original del SENA).

### Automático
- El sistema envía **automáticamente al correo del admin** el historial consolidado de la flota.
- **Frecuencia por defecto: cada 8 días.** Configurable a semanal, quincenal o mensual.
- El correo incluye PDF/Excel adjunto con: chequeos realizados, fallas detectadas, vehículos bloqueados, vencimientos próximos.

---

## 10.9 Alcance MVP vs Fase 2 (post-MVP)

### 🎯 MVP (lo que se entrega antes del TRL 7)
1. Login (admin y conductor)
2. Gestión de conductores (admin)
3. Gestión de vehículos con fotos (admin)
4. 5 preguntas de aptitud del conductor con bloqueo
5. Búsqueda y confirmación de vehículo por placa
6. Checklist preoperacional (39 ítems, Cumple/No cumple/N/A)
7. Checklist **post-operacional**
8. Validación automática de fallas críticas → bloqueo vehículo
9. Dashboard con semáforo
10. Bandeja de alertas en tiempo real (campanita + correo)
11. Historial filtrable
12. Exportación a Excel y PDF
13. Envío automático de historial por correo (cada 8 días)
14. Alertas de vencimientos (SOAT, RTM, extintor, licencia)

### 🔮 Fase 2 (post-MVP, mejoras posteriores)
- Modo oscuro para conductores de madrugada
- Funcionamiento offline (PWA con sincronización)
- Módulo de órdenes de trabajo (convertir falla → orden a taller)
- Asignación de talleres y seguimiento de reparaciones
- App móvil nativa
- Analytics y reportes avanzados (tendencias, costos)
- Integración con sistema institucional SENA

> ⚠️ **Nota:** este "Fase 2 post-MVP" del HTML NO es lo mismo que la "Fase 2" del README. En el README, las fases 0-8 son etapas internas de desarrollo. En el HTML del cliente, hablan de MVP vs post-MVP.

---

## 11. Reglas de negocio del chequeo preoperacional

### Acceso a vehículos
- El conductor solo ve vehículos de **su mismo centro** (multi-tenant).

### Frecuencia
- **Sin restricción de cantidad** de chequeos por día por vehículo.
- El **primer chequeo del día** se marca automáticamente como **"oficial"** (cuenta para reportes y estadísticas).
- Los demás chequeos del mismo día se marcan como **"rechequeo"** (útil si hubo reparación a mediodía y se quiere revalidar).

### Vehículo en estado Crítico / No operativo
- **Si el vehículo está activo** (campo `activo = true`):
  - Se **permite** intentar el chequeo.
  - Al guardar, se **notifica al admin** del centro para que decida si autoriza la operación.
  - El admin puede aprobar o rechazar manualmente.
- **Si el vehículo está desactivado** (`activo = false`):
  - **Se bloquea** el chequeo con mensaje claro: "Vehículo deshabilitado, no se puede usar."
  - Se **registra el intento** en una tabla de logs (`intentos_chequeo_bloqueado`).
  - Se **notifica al admin** del intento para su seguimiento.
  - Para poder hacer el chequeo, el admin debe primero habilitar el vehículo.

### Aptitud del conductor (5 preguntas)
- Si alguna respuesta es **no apta** → se bloquea el flujo completo, no se muestran vehículos, se registra el intento y se notifica al admin.

### Resultado y autorización
- Verde → autorizado automáticamente, se actualiza estado del vehículo si aplica.
- Amarillo → autorizado con observaciones, notificación al admin.
- Rojo → bloqueado, notificación urgente al admin, conductor no puede operar el vehículo.

---

## 12. Decisiones de diseño relevantes (acumuladas)

### Estado del vehículo y nivel de criticidad (Fase 2)
Vinculados automáticamente:

| Estado | Rango de criticidad | Centro |
|---|---|---|
| Operativo | 0% – 19% | 10% |
| Observación | 20% – 39% | 30% |
| Alerta | 40% – 59% | 50% |
| Crítico | 60% – 89% | 75% |
| No operativo | 90% – 100% | 95% |

### Modal de creación/edición (Fase 2)
- **Unificado** en un solo componente que recibe la prop `vehiculo` opcional.
- **No se cierra** al hacer click fuera. Solo cierra con X o tecla Esc.

### Visualización del RUNT (Fase 2)
- Subido a Cloudinary como `image` + `format: "pdf"` para que se sirva inline.
- Renderizado en iframe con el visor PDF **nativo del navegador**.
- Archivos nombrados como `runt_PLACA.pdf` para trazabilidad.

### Caché HTTP
- Triple defensa: `cache: 'no-store'` + headers `Cache-Control/Pragma` + sufijo `?_=timestamp` único en cada GET.

### Toast reutilizable
- 4 tipos: éxito, error, advertencia, info.
- 2 posiciones: abajo-derecha (default), arriba-centro (para errores de archivos).
- Animación de entrada y salida + barra de progreso.

### Actualización automática del estado del vehículo tras cerrar un chequeo (Fase 3)

**Regla:** el estado del vehículo se actualiza automáticamente **sólo si el resultado del chequeo es PEOR** que el estado actual.

| Resultado del chequeo vs estado actual del vehículo | Acción |
|---|---|
| **Peor** (ej: vehículo Operativo → chequeo da Crítico) | Actualiza el estado del vehículo automáticamente |
| **Igual** | No hace nada |
| **Mejor** (ej: vehículo Crítico → chequeo da Operativo) | **NO** actualiza. Dispara notificación al admin con sugerencia: *"El último chequeo de [placa] sugiere bajar el estado de Crítico a Operativo. ¿Aplicar el cambio?"* — botón rápido en el panel del admin |

**Razón:** evita que un chequeo casual borre el historial de fallas reportadas (legalmente importante). El admin tiene la última palabra cuando hay mejoría.

**Implementación:**
- Cuando se cierra el chequeo, el backend compara resultado vs estado actual del vehículo.
- Si peor → `UPDATE vehiculos SET estado = X` automático.
- Si mejor → respuesta del cierre incluye `sugerencia_admin` con el nuevo estado propuesto, y el frontend del admin lo muestra como acción pendiente.

### Búsqueda de vehículo por placa en flujo del conductor

Cuando el conductor selecciona el vehículo a operar:
- Lista todos los vehículos activos de su centro (los inactivos quedan ocultos).
- Búsqueda por placa con autocompletado (filtrado en tiempo real).
- Mantiene el orden por placa ascendente por defecto.

### Política de fotos en el sistema (Fase 3)
Hay **dos tipos de fotos** con políticas distintas:

**Fotos del vehículo (sube el ADMIN, Fase 2)**
- **Sin límite, sin borrado automático.** Permanecen mientras exista el vehículo.
- Razón: son fotos de identificación, son pocas y el admin las controla manualmente.

**Fotos de evidencia del chequeo (sube el CONDUCTOR, Fase 3)**
- **Máximo 5 fotos** por ítem marcado como "NO CUMPLE".
- **Borrado automático a los 12 meses** desde la fecha del chequeo.
- El admin puede **borrar manualmente** cuando quiera (antes del año).
- El admin puede **marcar fotos como "preservar permanentemente"** si son evidencia importante (un campo `preservar_siempre: boolean` en la tabla de fotos del chequeo).
- **Notificación al admin 30 días antes** del borrado automático para que decida si preservar alguna.
- Razón: son evidencia legal pero el storage debe controlarse. 12 meses es plazo razonable para reclamaciones y auditorías.

### Estructura mínima de notificaciones (Fase 3 — sin contar Fase 5 que es la implementación)
- **Inmediata** (campanita + correo): nuevo chequeo, intento de conductor no apto, intento de chequeo en vehículo desactivado, falla crítica detectada.
- **Diferida** (correo o campanita, sin urgencia): fotos próximas a borrarse (30 días antes), vencimientos próximos.
- **Programada** (correo): resumen consolidado cada 8 días (configurable).

---

## 13. 🚧 PENDIENTES DE CONFIRMACIÓN con coordinación SENA

Lista oficial de puntos que requieren respuesta antes de cerrar el MVP (extraídos del PDF de requerimientos):

1. **Alcance de "R6 o R7"**: ¿Fase específica del proyecto SENA? ¿Nivel de prototipo? ¿RAP de la guía de formación?
2. **Hosting definitivo**: ¿Servidor físico del SENA o nube (Vercel/Railway/Render)?
3. **Frecuencia de reportes**: ¿Mantener cada 8 días por defecto o cambiar?
4. **Branding estricto**: ¿Manual de imagen formal o diseño libre con sugerencias?
5. **Política de contraseñas**: parámetros finales (longitud, expiración, etc.).
6. **Respaldos**: ¿el centro asume el backup o el dev implementa estrategia autónoma?

Pendientes específicos de arquitectura multinivel:
- Confirmación de jerarquía 5 niveles refleja estructura real del SENA.
- Flujo de creación/reasignación de admins en cada nivel.
- Alcance esperado para TRL 7 (un centro o demo multi-nivel).
- Reglas de escalamiento de alertas críticas hacia niveles superiores.
- Necesidad de reportes consolidados regionales/nacionales.
- Política de préstamo de vehículos entre centros (caso OJX 793).

Pendientes específicos de Fase 3:
- Si la app del conductor debe funcionar **offline** (poca señal en patio) y sincronizar después. **Aclarado por HTML:** PWA con sincronización es **Fase 2 post-MVP**, no MVP.
- ✅ **Resuelto:** las 5 preguntas exactas (ver sección 10).
- ✅ **Resuelto:** qué ítems son críticos automáticos (sistema de frenos, dirección, luces de stop, luces altas/medias/bajas, direccionales — ver sección 9).
- Lógica fina del semáforo amarillo: ¿cuántos ítems no críticos en mal estado = amarillo vs verde? Por confirmar con coordinación.

---

## 14. Bugs y advertencias activas (referencia)

Ver `docs/bitacora/bugs-conocidos.md` para detalle completo.

**Resumen de los más críticos:**

| ID | Estado | Resumen |
|---|---|---|
| BUG-001 | 🟡 **Parche aplicado** | Cliente Supabase pierde conexiones tras inactividad. Mitigado con `keepAlive.js` cada 4 min. **Investigar causa raíz antes de producción.** |
| BUG-007 | ✅ Resuelto | RUNT 401 en Cloudinary. Requiere habilitar "PDF and ZIP files delivery" en Settings → Security de cada cuenta Cloudinary. **Documentar en manual de despliegue.** |

---

## 15. Notas para futuros desarrolladores / IAs que retomen el proyecto

### Reglas de oro

1. **Al arrancar una sesión nueva**, leer este archivo **completo** antes de tocar nada. Aquí está la verdad del proyecto.
2. **Cuando se defina algo nuevo** (regla, decisión, dato del dominio), **agregarlo aquí**. No dejarlo perderse en el chat.
3. **Cuando algo se termine**, marcarlo con ✅ en la sección 0.1 "Estado actual del proyecto" para que el panorama esté siempre vigente.
4. **Cuando algo cambie respecto a lo planeado**, NO borrar lo viejo: **marcarlo como obsoleto** (tachado o con ⚠️) y agregar lo nuevo. Así queda historia y razón del cambio.

### División de responsabilidades entre archivos `.md` y `.docx`

| Archivo | Qué va ahí | Qué NO va ahí |
|---|---|---|
| `docs/CONTEXTO_PROYECTO.md` (este) | **Reglas de negocio, dominio, estado actual del proyecto, decisiones, pendientes.** Fuente de verdad. | Detalles técnicos granulares, capturas. |
| `docs/bitacora/bitacora.docx` | Documento formal para SENNOVA con capturas, problemas resueltos, formato presentable. | Detalles técnicos de implementación, snippets. |
| `docs/bitacora/semana-N-cambios.md` | Detalle técnico crudo de la semana (props, ejemplos, SQL exactos). | Reglas de negocio. |
| `docs/bitacora/bugs-conocidos.md` | Bugs, su estado, causa raíz, fix y advertencias para producción. | Decisiones de diseño. |
| `README.md` | Setup, fases, endpoints, stack. Para alguien que clone el repo. | Reglas de negocio finas. |

### Convención de actualización al cerrar fase

Al cerrar cada fase, hacer estas 3 cosas:

**1. En este archivo (sección 0.1):**
- Mover la fase de "EN CURSO" a "YA está hecho" con ✅.
- Listar lo que pasa a "VIENE después".

**2. En el README:**
- Marcar la fase como ✅ en la tabla.
- Agregar/quitar items del detalle de la fase.

**3. En la bitácora `.docx`:**
- Agregar bullets nuevos a "Actividades realizadas".
- Agregar decisiones a "Decisiones técnicas".
- Agregar problemas resueltos a "Problemas encontrados y soluciones".
- Quitar de "Pendientes" lo que se hizo.

### Cuando algo cambie respecto al HTML/PDF de requerimientos

El HTML de mayo 2026 tiene desviaciones intencionales (ver sección ⚠️ al inicio). **Si encuentras más en el futuro:**
- NO borrar el dato del HTML.
- Agregar la fila a la tabla de desviaciones de la sección ⚠️.
- Explicar qué se hizo y por qué.

---

## 16. 🔄 Convención de actualización automática (regla obligatoria para la IA)

> **Para que el contexto no se pierda entre sesiones**, la IA que esté trabajando en este proyecto **debe actualizar los archivos correspondientes automáticamente** ante cada uno de estos eventos, sin esperar a que el usuario lo pida.

### Tabla de eventos → archivos a actualizar

| Evento | Archivo(s) a actualizar | Detalle |
|---|---|---|
| **Decisión de diseño nueva** (ej: "elegimos opción D para X") | `CONTEXTO_PROYECTO.md` sección 12 (Decisiones acumuladas) | Agregar bullet con la decisión + 1 línea de razón |
| **Bug encontrado** (sea resuelto o no) | `docs/bitacora/bugs-conocidos.md` | Nuevo bug con ID secuencial (BUG-008, etc.) + síntoma + causa + fix + estado |
| **Componente o módulo nuevo creado** | `docs/bitacora/semana-N-cambios.md` | Sección "Componentes y módulos creados" con ruta + props + uso |
| **Cambio en regla de negocio** | `CONTEXTO_PROYECTO.md` sección 11 + sección ⚠️ si reemplaza algo del HTML | Reglas en sección 11, desviación en sección ⚠️ si aplica |
| **Tarea importante cerrada** (ej: una tarea del task list que era visible al usuario) | `CONTEXTO_PROYECTO.md` sección 0.1 (Estado actual) | Mover de "EN CURSO" a "YA está hecho" con ✅ |
| **Cierre de fase completa** | TODOS: contexto + README + bitacora.docx + semana-N-cambios.md | Ver convención de cierre de fase en sección 15 |
| **Endpoint nuevo creado** | `docs/bitacora/semana-N-cambios.md` tabla de endpoints | Método + ruta + descripción |
| **Tabla SQL nueva o modificada** | `docs/bitacora/semana-N-cambios.md` + `CONTEXTO_PROYECTO.md` si afecta dominio | Schema breve + razón |
| **Variable de entorno nueva o servicio externo activado** | `README.md` sección de setup | Para que quien clone el repo lo sepa |
| **Cambio que afecta cómo se despliega** | `README.md` + advertencia en `bugs-conocidos.md` si requiere acción manual | Ej: el RUNT requiere activar PDF/ZIP delivery en Cloudinary |
| **Decisión de diseño rechazada o reemplazada** | Sección ⚠️ de `CONTEXTO_PROYECTO.md` + tacharlo donde aparezca | NO borrar, marcar como obsoleto y agregar la nueva |
| **Pendiente resuelto con SENA** (ej: confirmaron algo del PDF) | `CONTEXTO_PROYECTO.md` sección 13 | Marcar con ✅ y agregar la decisión final |
| **Cambio en la base de datos** (CREATE TABLE, ALTER TABLE, agregar columna, crear índice, trigger, etc.) | `database/database.sql` + seed correspondiente en `database/seeds/` si aplica | Reflejar siempre el estado real de la BD para que el repo sea reproducible desde cero. Si se modifica un seed existente, regenerar la verificación al final del archivo. |
| **Carga inicial de datos nuevos** (ej: nuevas categorías, nuevos centros de formación) | Nuevo archivo en `database/seeds/` con número secuencial (06_, 07_, etc.) + actualizar `database/README.md` lista de archivos | Mantener el orden numérico de ejecución |

### Qué NO actualizo automáticamente (sería ruido)

- Ajustes de color, padding, fuente.
- Renombres de variables internas.
- Refactors pequeños sin cambio de comportamiento.
- Typos.
- Cambios que el usuario describe como "pequeño detalle, no lo añadimos".

### Cómo lo aplica la IA

1. **Después de cada cambio significativo**, antes de pasar al siguiente tema, la IA debe revisar mentalmente esta tabla.
2. **Avisar al usuario** cuando actualice algo: "Esto lo guardé en `CONTEXTO_PROYECTO.md` sección 12 / `bugs-conocidos.md` BUG-008 / etc."
3. **Si tiene duda** de si vale la pena guardar algo, preguntar: "¿Lo añado a la bitácora o lo dejo solo en código?"
4. **Al final de cada sesión larga**, hacer un repaso rápido y mencionar al usuario qué archivos quedaron tocados para que él decida si commitear.

### Compromiso de la IA actual

> "Yo, la IA trabajando en este proyecto, me comprometo a aplicar esta convención automáticamente. Si no la sigo, el usuario tiene derecho a recordármelo con: **'recordá la convención de la sección 16'** y debo aplicarla de inmediato."

---

## 17. ✏️ Convenciones de estilo (código y documentación)

Reglas de estilo que aplican a todos los archivos del proyecto. Si la IA no las sigue, el usuario puede recordarlo con: **"recordá la sección 17"**.

### Comentarios y separadores en SQL

**❌ NO usar** separadores largos con muchos signos de igual:
```sql
-- =====================================================================
-- Sección
-- =====================================================================
```

**✅ SÍ usar** separador corto (`-- ==`):
```sql
-- ==
-- Sección
-- ==
```

Aplica a todos los `.sql` del proyecto: `database/database.sql`, todos los `database/seeds/`, scripts SQL en respuestas del chat, etc.

### Comentarios en código (JavaScript, JSX, CSS, etc.)

- **Comentarios cortos y útiles.** Explicar el *por qué*, no el *qué*.
- **NO repetir lo obvio.** Si el código se lee solo, no hace falta comentario.
- **NO usar grandes bloques de comentarios decorativos** estilo `// =================================`.

### Otros estilos del proyecto (recordatorio)

- **Sin emojis en código ni UI** (salvo casos puntuales que el usuario apruebe — íconos del proyecto, logos institucionales).
- **CSS modular** separado por componente, sin Tailwind, con variables propias.
- **Commits sin prefijo** tipo `feat:`/`fix:` — solo texto descriptivo.
- **Snake_case en español** para nombres de tablas, columnas, archivos SQL.
- **camelCase en español** para variables y funciones de JavaScript.
- **kebab-case** para nombres de archivos `.css` y rutas URL.

### Documentación markdown

- **Títulos jerárquicos** con `#`, `##`, `###`.
- **Tablas** para datos comparativos.
- **Bloques de código** con triple backtick + lenguaje.
- **Listas con `-`** (no con `*`).
- **Negritas** para resaltar palabras clave, **NO** para frases completas.
