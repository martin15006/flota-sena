ALTER TABLE chequeos_preoperacionales
    ADD COLUMN IF NOT EXISTS abandonado        BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS abandonado_en     TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS motivo_abandono   TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chequeos_motivo_abandono_check'
    ) THEN
        ALTER TABLE chequeos_preoperacionales
            ADD CONSTRAINT chequeos_motivo_abandono_check
            CHECK (motivo_abandono IS NULL OR motivo_abandono IN (
                'inactividad',
                'cerro_sesion',
                'cerro_pestana',
                'manual'
            ));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_chequeos_abandonados
    ON chequeos_preoperacionales (abandonado_en DESC)
    WHERE abandonado = true;
