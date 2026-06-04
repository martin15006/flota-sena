# Evidencias visuales de bugs y eventos del proyecto

Carpeta para guardar las capturas de pantalla que respaldan los bugs, decisiones y entregables del proyecto.

## Convención de nombres

Para que las capturas sean fáciles de encontrar:

```
BUG-XXX_descripcion-corta.png
```

Ejemplos:
- `BUG-009_resumen-0-0-0.png`
- `BUG-009_resumen-correcto-despues-del-fix.png`
- `FASE-3_dashboard-conductor.png`
- `FASE-3_pantalla-resultado-no-operativo.png`

**Reglas:**
- Usar PNG o JPG (no GIFs ni screenshots de baja calidad).
- Nombre con guiones bajos para separar partes lógicas (`BUG-009_xxx_xxx.png`).
- Si hay antes/después de un fix, el "después" se nombra `BUG-XXX_despues-del-fix.png`.
- Si la captura tiene información sensible (tokens, contraseñas), tapar manualmente antes de guardar.

## Referenciar en bugs-conocidos.md

Cada bug que tenga evidencia debe tener una sección:

```markdown
**📸 Evidencia visual:**
- `evidencias/BUG-XXX_descripcion.png` — descripción de qué muestra
```

Así el lector del bug puede ver exactamente qué pasaba.
