DO $$
DECLARE
    reg_andina      UUID := (SELECT id FROM regiones WHERE nombre = 'Región Andina');
    reg_caribe      UUID := (SELECT id FROM regiones WHERE nombre = 'Región Caribe');
    reg_pacifica    UUID := (SELECT id FROM regiones WHERE nombre = 'Región Pacífica');
    reg_amazonica   UUID := (SELECT id FROM regiones WHERE nombre = 'Región Amazónica');
    reg_orinoquia   UUID := (SELECT id FROM regiones WHERE nombre = 'Región de la Orinoquía');
BEGIN
    INSERT INTO departamentos (nombre, region_id) VALUES
        ('Antioquia',                       reg_andina),
        ('Bogotá D.C.',                     reg_andina),
        ('Boyacá',                          reg_andina),
        ('Caldas',                          reg_andina),
        ('Cundinamarca',                    reg_andina),
        ('Huila',                           reg_andina),
        ('Norte de Santander',              reg_andina),
        ('Quindío',                         reg_andina),
        ('Risaralda',                       reg_andina),
        ('Santander',                       reg_andina),
        ('Tolima',                          reg_andina),

        ('Atlántico',                       reg_caribe),
        ('Bolívar',                         reg_caribe),
        ('Cesar',                           reg_caribe),
        ('Córdoba',                         reg_caribe),
        ('La Guajira',                      reg_caribe),
        ('Magdalena',                       reg_caribe),
        ('San Andrés y Providencia',        reg_caribe),
        ('Sucre',                           reg_caribe),

        ('Cauca',                           reg_pacifica),
        ('Chocó',                           reg_pacifica),
        ('Nariño',                          reg_pacifica),
        ('Valle del Cauca',                 reg_pacifica),

        ('Amazonas',                        reg_amazonica),
        ('Caquetá',                         reg_amazonica),
        ('Guainía',                         reg_amazonica),
        ('Guaviare',                        reg_amazonica),
        ('Putumayo',                        reg_amazonica),
        ('Vaupés',                          reg_amazonica),

        ('Arauca',                          reg_orinoquia),
        ('Casanare',                        reg_orinoquia),
        ('Meta',                            reg_orinoquia),
        ('Vichada',                         reg_orinoquia)
    ON CONFLICT (nombre, region_id) DO NOTHING;
END $$;

