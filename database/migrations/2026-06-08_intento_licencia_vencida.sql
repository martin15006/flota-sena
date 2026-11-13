ALTER TABLE intentos_chequeo_bloqueado
    DROP CONSTRAINT IF EXISTS intentos_chequeo_bloqueado_razon_check;

ALTER TABLE intentos_chequeo_bloqueado
    ADD CONSTRAINT intentos_chequeo_bloqueado_razon_check
    CHECK (razon IN (
        'conductor_no_apto',
        'vehiculo_desactivado',
        'vehiculo_no_existe',
        'sesion_invalida',
        'licencia_vencida'
    ));
