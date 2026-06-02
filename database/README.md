# Carpeta `database/` — Esquema y datos iniciales

Esta carpeta contiene el SQL **completo** del proyecto: estructura de tablas y datos semilla (seeds) para reconstruir la base de datos desde cero si se necesita.

## Estructura

```
database/
├── README.md                          ← este archivo
├── database.sql                       ← schema completo: 19 tablas + triggers + índices
└── seeds/
    ├── 01_categorias_chequeo.sql      ← las 5 categorías del checklist
    ├── 02_items_chequeo.sql           ← los 39 ítems normativos
    ├── 03_preguntas_aptitud.sql       ← las 5 preguntas del conductor
    ├── 04_regiones.sql                ← las 5 regiones del SENA en Colombia
    └── 05_departamentos.sql           ← los 32 departamentos asignados a regiones
```

## Cómo ejecutar desde cero

### Opción A: Desde Supabase Dashboard
1. Abre tu proyecto en https://supabase.com/dashboard
2. Ve a **SQL Editor** (icono `<>` en la barra lateral).
3. Click en **+ New query**.
4. Pega el contenido de `database.sql` → click **Run**.
5. Después, en orden, los seeds:
   - `seeds/01_categorias_chequeo.sql`
   - `seeds/02_items_chequeo.sql`
   - `seeds/03_preguntas_aptitud.sql`
   - `seeds/04_regiones.sql`
   - `seeds/05_departamentos.sql`
6. **Manualmente**: registrar ciudades, centros de formación, usuarios admin y vehículos según lo que necesite el centro específico (no hay seeds para estos porque varían por implementación).

### Opción B: psql desde línea de comandos
```bash
psql "postgresql://..." -f database.sql
psql "postgresql://..." -f seeds/01_categorias_chequeo.sql
psql "postgresql://..." -f seeds/02_items_chequeo.sql
psql "postgresql://..." -f seeds/03_preguntas_aptitud.sql
psql "postgresql://..." -f seeds/04_regiones.sql
psql "postgresql://..." -f seeds/05_departamentos.sql
```

## Alcance del archivo

El archivo `database.sql` cubre **todas las tablas del proyecto** (Fases 1, 2 y 3) en orden de dependencias correcto:

| Fase | Tablas |
|---|---|
| **Fase 2** (geografía) | `regiones`, `departamentos`, `ciudades`, `centros_formacion` |
| **Fase 1** (autenticación) | `usuarios`, `auditoria_usuarios` |
| **Fase 2** (vehículos) | `vehiculos`, `fotos_vehiculo`, `auditoria_vehiculos` |
| **Fase 3** (catálogos del chequeo) | `categorias_chequeo`, `items_chequeo`, `preguntas_aptitud` |
| **Fase 3** (excepciones) | `excepciones_items_vehiculo` |
| **Fase 3** (chequeos) | `chequeos_preoperacionales`, `respuestas_chequeo`, `respuestas_aptitud` |
| **Fase 3** (evidencia) | `fotos_chequeo` |
| **Fase 3** (logs) | `intentos_chequeo_bloqueado`, `auditoria_chequeos` |

**Total: 19 tablas** + 2 triggers + 11 índices.

## Idempotencia

Todos los `CREATE TABLE` usan `IF NOT EXISTS` y los `INSERT` de seeds usan `ON CONFLICT DO NOTHING` o `DELETE` previo, así que **se puede re-ejecutar sin riesgo**: no rompe nada si la tabla o el dato ya existen.

## Requisitos previos

- **PostgreSQL 15+** (usa `gen_random_uuid()` nativo y arrays).
- **Schema `auth` de Supabase Auth** debe existir antes de correr esto (la tabla `usuarios.id` referencia `auth.users(id)`). Si lo corres en un PostgreSQL puro fuera de Supabase, ajusta esa FK o elimínala temporalmente.
- Permisos para crear tablas, funciones, triggers e índices en el schema `public`.

## Convenciones

- **Nombres:** snake_case en español para tablas y columnas.
- **Llaves primarias:** UUID con `gen_random_uuid()` para entidades de negocio, SERIAL para catálogos pequeños.
- **Timestamps:** siempre con timezone (`TIMESTAMPTZ`).
- **Soft delete:** usar `activo BOOLEAN DEFAULT true` en lugar de borrar registros importantes.
- **Auditoría:** `created_at` y `updated_at` en tablas que se editan.
- **Foreign keys con CASCADE:** sólo en relaciones "hijo eliminado si padre se elimina" (ej: `fotos_vehiculo` se borra con el `vehiculo`).
- **Foreign keys con SET NULL:** en relaciones de auditoría (`accion_por_id`).
- **Foreign keys con RESTRICT:** en relaciones que protegen integridad (`vehiculos.centro_id`, `chequeos.vehiculo_id`).

## Mantenimiento

Cuando se agreguen nuevas tablas o se modifiquen existentes:
1. Actualizar `database.sql` agregando el `CREATE TABLE IF NOT EXISTS` en la sección apropiada.
2. Si es un catálogo nuevo, agregar seed en `seeds/` con número secuencial.
3. Si es un cambio destructivo (DROP COLUMN, etc.), agregar nota explicativa al inicio del archivo.
4. Actualizar este README si cambia la lista de tablas o el orden de ejecución.
