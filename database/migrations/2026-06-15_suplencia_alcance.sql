ALTER TABLE suplencias
    ADD COLUMN IF NOT EXISTS alcance TEXT NOT NULL DEFAULT 'centro';

ALTER TABLE suplencias
    ADD COLUMN IF NOT EXISTS departamento_id UUID REFERENCES departamentos(id) ON DELETE CASCADE;

ALTER TABLE suplencias
    ALTER COLUMN centro_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_suplencias_departamento ON suplencias(departamento_id);
