INSERT INTO regiones (nombre) VALUES
    ('Región Andina'),
    ('Región Caribe'),
    ('Región Pacífica'),
    ('Región Amazónica'),
    ('Región de la Orinoquía')
ON CONFLICT (nombre) DO NOTHING;
