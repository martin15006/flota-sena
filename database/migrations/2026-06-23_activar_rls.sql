ALTER TABLE regiones                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE departamentos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciudades                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE centros_formacion           ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_usuarios          ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehiculos                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE fotos_vehiculo              ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_vehiculos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_chequeo          ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_chequeo               ENABLE ROW LEVEL SECURITY;
ALTER TABLE preguntas_aptitud           ENABLE ROW LEVEL SECURITY;
ALTER TABLE excepciones_items_vehiculo  ENABLE ROW LEVEL SECURITY;
ALTER TABLE chequeos_preoperacionales   ENABLE ROW LEVEL SECURITY;
ALTER TABLE respuestas_chequeo          ENABLE ROW LEVEL SECURITY;
ALTER TABLE respuestas_aptitud          ENABLE ROW LEVEL SECURITY;
ALTER TABLE fotos_chequeo               ENABLE ROW LEVEL SECURITY;
ALTER TABLE intentos_chequeo_bloqueado  ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_chequeos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones              ENABLE ROW LEVEL SECURITY;
ALTER TABLE suplencias                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE intentos_login              ENABLE ROW LEVEL SECURITY;

SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

