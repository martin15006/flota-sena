DELETE FROM auth.users
WHERE id IN (
    SELECT id FROM usuarios WHERE rol IN ('admin_regional', 'admin_ciudad')
);

