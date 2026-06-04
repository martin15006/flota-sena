# Semana 4 — Detalle técnico de cambios

**Periodo:** 2 - 8 de junio de 2026
**Fase del proyecto:** Fase 3 (Chequeo preoperacional)

Este archivo documenta el detalle técnico crudo. Para el resumen ejecutivo ver `bitacora.docx`. Para los bugs encontrados durante la fase, ver `bugs-conocidos.md`.

---

## Bugs encontrados y corregidos

### BUG-009 — Resumen del chequeo mostraba 0/0/0

**Detectado por:** El usuario, al probar el flujo del conductor en QA manual.

**Síntoma corto:** La pantalla de "Vehículo NO OPERATIVO" mostraba los conteos del resumen del checklist en cero (0 cumple, 0 no cumple, 0 N/A), aunque el estado general sí se calculaba bien.

**Causa:** Desalineación de nombres de campo entre backend (`items_*_count`) y frontend (`total_*`). Adicionalmente, el conteo de ítems críticos en NO CUMPLE no se calculaba en el backend.

**Fix:** Agregar el cálculo en el servicio, reenviar el campo desde el controller, alinear nombres en el componente del frontend.

**Documentación completa:** Ver `bugs-conocidos.md → BUG-009`.

**Evidencia visual:** `evidencias/BUG-009_resumen-0-0-0.png` (captura del usuario).

### BUG-010 — Intentos bloqueados con vehículo inexistente se perdían silenciosamente

**Detectado por:** El usuario, al probar manualmente el escenario `vehiculo_no_existe` con Thunder Client.

**Síntoma corto:** El endpoint `POST /api/chequeos/iniciar` devolvía el error esperado, pero el intento bloqueado no quedaba registrado en la BD. La pantalla del admin no mostraba nada.

**Causa:** La tabla `intentos_chequeo_bloqueado` tiene FK a `vehiculos(id)`. Cuando el cliente mandaba un UUID inexistente, el INSERT al log fallaba por violación de FK. El servicio solo logueaba el error sin propagarlo.

**Fix:** Pasar `null` en lugar del UUID inexistente cuando `verif.vehiculo` es null. Defensa adicional: si el INSERT falla por FK, reintentar con null.

**Documentación completa:** Ver `bugs-conocidos.md → BUG-010`.

---

## Cambios técnicos principales

> *(Sección por completar al cierre de Fase 3 con el listado consolidado de componentes, endpoints y pantallas creadas durante la semana.)*

Resumen rápido de lo que avanzó hasta hoy:
- Frontend completo del flujo del conductor: dashboard, aptitud, selección de vehículo, checklist de 5 categorías, resultado.
- Admin del catálogo del chequeo (`/admin/catalogo`) con CRUD para categorías, ítems y preguntas de aptitud.
- Búsqueda tolerante de placas (ignora espacios y mayúsculas).
- Eliminación inteligente en catálogo: hard delete si la entidad no tiene historial, soft delete si ya fue usada.
- Convención de contraste visual agregada a `CONTEXTO_PROYECTO.md` sección 17 (no bordes claros, no gris-500 en subtítulos).
- `docs/MAPA_DEL_CODIGO.md` creado como guía rápida para desarrolladores nuevos.
- Carpeta `docs/bitacora/evidencias/` creada para capturas de bugs y eventos.
