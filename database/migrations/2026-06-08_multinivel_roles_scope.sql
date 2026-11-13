ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'admin_centro';
ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'admin_ciudad';
ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'admin_departamental';
ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'admin_regional';
ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'superadmin';

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS ciudad_id        UUID REFERENCES ciudades(id)       ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS departamento_id  UUID REFERENCES departamentos(id)  ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS region_id        UUID REFERENCES regiones(id)       ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_usuarios_ciudad        ON usuarios(ciudad_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_departamento  ON usuarios(departamento_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_region        ON usuarios(region_id);
