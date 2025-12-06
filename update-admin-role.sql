-- Actualizar el rol del usuario hunkfull@gmail.com a 'admin'
UPDATE "user" 
SET role = 'admin'
WHERE email = 'hunkfull@gmail.com';

-- Verificar que se actualizó
SELECT id, email, role FROM "user" WHERE email = 'hunkfull@gmail.com';
