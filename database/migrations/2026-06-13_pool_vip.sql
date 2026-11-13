ALTER TABLE vehiculos
    ADD COLUMN IF NOT EXISTS es_vip BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS es_pool BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_vehiculos_es_vip ON vehiculos(es_vip);
