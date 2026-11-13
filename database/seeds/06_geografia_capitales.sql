INSERT INTO ciudades (nombre, departamento_id)
SELECT v.ciudad, d.id
FROM (VALUES
    ('Leticia',                 'Amazonas'),
    ('Medellín',                'Antioquia'),
    ('Arauca',                  'Arauca'),
    ('Barranquilla',            'Atlántico'),
    ('Bogotá',                  'Bogotá D.C.'),
    ('Cartagena',               'Bolívar'),
    ('Tunja',                   'Boyacá'),
    ('Manizales',               'Caldas'),
    ('Florencia',               'Caquetá'),
    ('Yopal',                   'Casanare'),
    ('Popayán',                 'Cauca'),
    ('Valledupar',              'Cesar'),
    ('Quibdó',                  'Chocó'),
    ('Montería',                'Córdoba'),
    ('Soacha',                  'Cundinamarca'),
    ('Inírida',                 'Guainía'),
    ('San José del Guaviare',   'Guaviare'),
    ('Neiva',                   'Huila'),
    ('Riohacha',                'La Guajira'),
    ('Santa Marta',             'Magdalena'),
    ('Villavicencio',           'Meta'),
    ('Pasto',                   'Nariño'),
    ('Cúcuta',                  'Norte de Santander'),
    ('Mocoa',                   'Putumayo'),
    ('Armenia',                 'Quindío'),
    ('Pereira',                 'Risaralda'),
    ('San Andrés',              'San Andrés y Providencia'),
    ('Bucaramanga',             'Santander'),
    ('Sincelejo',               'Sucre'),
    ('Ibagué',                  'Tolima'),
    ('Espinal',                 'Tolima'),
    ('Cali',                    'Valle del Cauca'),
    ('Mitú',                    'Vaupés'),
    ('Puerto Carreño',          'Vichada')
) AS v(ciudad, departamento)
JOIN departamentos d ON d.nombre = v.departamento
ON CONFLICT (nombre, departamento_id) DO NOTHING;

INSERT INTO centros_formacion (nombre, ciudad_id, direccion)
SELECT 'Centro de Servicios Financieros', c.id, NULL
FROM ciudades c JOIN departamentos d ON d.id = c.departamento_id
WHERE c.nombre = 'Bogotá' AND d.nombre = 'Bogotá D.C.'
  AND NOT EXISTS (
    SELECT 1 FROM centros_formacion cf
    WHERE cf.nombre = 'Centro de Servicios Financieros' AND cf.ciudad_id = c.id
  );

INSERT INTO centros_formacion (nombre, ciudad_id, direccion)
SELECT 'Centro de Servicios de Salud', c.id, NULL
FROM ciudades c JOIN departamentos d ON d.id = c.departamento_id
WHERE c.nombre = 'Medellín' AND d.nombre = 'Antioquia'
  AND NOT EXISTS (
    SELECT 1 FROM centros_formacion cf
    WHERE cf.nombre = 'Centro de Servicios de Salud' AND cf.ciudad_id = c.id
  );

INSERT INTO centros_formacion (nombre, ciudad_id, direccion)
SELECT 'Centro de Diseño Tecnológico Industrial', c.id, NULL
FROM ciudades c JOIN departamentos d ON d.id = c.departamento_id
WHERE c.nombre = 'Cali' AND d.nombre = 'Valle del Cauca'
  AND NOT EXISTS (
    SELECT 1 FROM centros_formacion cf
    WHERE cf.nombre = 'Centro de Diseño Tecnológico Industrial' AND cf.ciudad_id = c.id
  );

INSERT INTO centros_formacion (nombre, ciudad_id, direccion)
SELECT 'Centro de la Industria, la Empresa y los Servicios', c.id, NULL
FROM ciudades c JOIN departamentos d ON d.id = c.departamento_id
WHERE c.nombre = 'Neiva' AND d.nombre = 'Huila'
  AND NOT EXISTS (
    SELECT 1 FROM centros_formacion cf
    WHERE cf.nombre = 'Centro de la Industria, la Empresa y los Servicios' AND cf.ciudad_id = c.id
  );

INSERT INTO centros_formacion (nombre, ciudad_id, direccion)
SELECT 'Centro Agropecuario La Granja', c.id, NULL
FROM ciudades c JOIN departamentos d ON d.id = c.departamento_id
WHERE c.nombre = 'Espinal' AND d.nombre = 'Tolima'
  AND NOT EXISTS (
    SELECT 1 FROM centros_formacion cf
    WHERE cf.nombre = 'Centro Agropecuario La Granja' AND cf.ciudad_id = c.id
  );

SELECT
    (SELECT COUNT(*) FROM ciudades)           AS ciudades,
    (SELECT COUNT(*) FROM centros_formacion)  AS centros;
