CREATE TABLE IF NOT EXISTS suplencias (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id             UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    centro_id           UUID NOT NULL REFERENCES centros_formacion(id) ON DELETE CASCADE,
    activada_por_id     UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    motivo              TEXT,
    desde               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hasta               TIMESTAMPTZ,
    activa              BOOLEAN NOT NULL DEFAULT true,
    desactivada_por_id  UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    desactivada_at      TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suplencias_pool_activa   ON suplencias(pool_id, activa);
CREATE INDEX IF NOT EXISTS idx_suplencias_centro_activa ON suplencias(centro_id, activa);

ALTER TABLE suplencias DISABLE ROW LEVEL SECURITY;
