-- @report
SELECT 'test';

-- @select
SELECT id FROM VariableDeclaration WHERE kind = 'const';

-- @fix
UPDATE VariableDeclaration SET kind = 'let' WHERE id = :id;
UPDATE Identifier SET name = 'x' WHERE id = :id;