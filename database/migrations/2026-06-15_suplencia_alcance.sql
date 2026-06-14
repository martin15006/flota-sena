-- ============================================================================
-- MIGRACION 2026-06-15 (b) — Suplencia Fase B: alcance multi-centro
-- ============================================================================
-- Ver docs/diseno-pool-vip.md. La suplencia ahora puede cubrir:
--   - alcance = 'centro'        -> un solo centro (centro_id)
--   - alcance = 'departamento'  -> TODOS los centros de un departamento/regional
--                                   (departamento_id); el pool elige cual gestiona
--                                   con el "centro activo" (uno a la vez).
--
-- COMO APLICAR: Supabase SQL Editor -> pegar y Run. Idempotente.
-- (La tabla suplencias ya tiene RLS deshabilitado de la migracion anterior.)
-- ============================================================================

ALTER TABLE suplencias
    ADD COLUMN IF NOT EXISTS alcance TEXT NOT NULL DEFAULT 'centro';

ALTER TABLE suplencias
    ADD COLUMN IF NOT EXISTS departamento_id UUID REFERENCES departamentos(id) ON DELETE CASCADE;

-- centro_id pasa a ser opcional: es NULL cuando alcance = 'departamento'.
ALTER TABLE suplencias
    ALTER COLUMN centro_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_suplencias_departamento ON suplencias(departamento_id);
