-- @scope project

-- @report
SELECT 'Found const' AS message;

-- @select
SELECT file, id FROM VariableDeclaration WHERE kind = 'const';

-- @fix
UPDATE VariableDeclaration SET kind = 'let' WHERE id = :id;
