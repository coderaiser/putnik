-- @report
SELECT 'Binding found' AS message;

-- @select
SELECT id FROM Binding WHERE name = 'a';

-- @fix
UPDATE Binding SET name = 'b' WHERE id = :id;
