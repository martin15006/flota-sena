CREATE TABLE IF NOT EXISTS notificaciones (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    destinatario_id     UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo                TEXT NOT NULL,
    titulo              TEXT NOT NULL,
    mensaje             TEXT NOT NULL,
    url_destino         TEXT,
    chequeo_id          UUID,
    vehiculo_id         UUID,
    conductor_id        UUID,
    leida               BOOLEAN NOT NULL DEFAULT false,
    leida_en            TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'notificaciones_tipo_check'
    ) THEN
        ALTER TABLE notificaciones
            ADD CONSTRAINT notificaciones_tipo_check
            CHECK (tipo IN (
                'chequeo_abandonado',
                'chequeo_no_operativo',
                'chequeo_critico',
                'intento_bloqueado_aptitud',
                'intento_bloqueado_vehiculo',
                'licencia_proxima_vencer',
                'licencia_vencida',
                'vehiculo_sin_runt',
                'sistema'
            ));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notificaciones_destinatario
    ON notificaciones(destinatario_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notificaciones_no_leidas
    ON notificaciones(destinatario_id)
    WHERE leida = false;

ALTER TABLE notificaciones DISABLE ROW LEVEL SECURITY;
