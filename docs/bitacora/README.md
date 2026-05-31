# Carpeta de bitácora

Esta carpeta contiene el seguimiento del proyecto en dos formatos:

| Archivo | Propósito | Audiencia |
|---|---|---|
| `bitacora.docx` | Documento formal del proyecto con imágenes pegadas y formato presentable | SENNOVA, coordinación SENA, presentaciones |
| `semana-3-cambios.md` | Detalle técnico crudo de lo trabajado durante la semana 3 | El desarrollador, Claude, equipo técnico |
| `bugs-conocidos.md` | Bugs identificados, su estado, fix aplicado y advertencias para producción | El desarrollador, equipo técnico |

## Convención

- El **`.docx`** es el documento "oficial" que se presenta. Mantiene formato consistente, lenguaje claro y sólo lo relevante para la coordinación.
- Los **`.md`** son notas técnicas internas. Detalle granular, comandos, código, hipótesis descartadas, etc. **No se presentan**, sirven para que el desarrollador y el asistente IA mantengan contexto entre sesiones.
- Cuando algo de un `.md` interno madura y queda como decisión técnica relevante, **se resume y se pasa al `.docx`**.

## Cómo usar esto en sesiones nuevas con Claude

Al inicio de una sesión nueva, mostrarle a Claude estos archivos para que se ponga al día:
1. `README.md` (este archivo) — entiende la estructura
2. `bugs-conocidos.md` — sabe qué bugs hay activos o resueltos
3. `semana-N-cambios.md` — la semana más reciente, con detalle técnico

Eso reemplaza tener que volver a explicarle todo desde cero.
