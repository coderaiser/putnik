-- @report
SELECT 'test';

-- @select
SELECT id FROM VariableDeclaration WHERE kind = 'const';

-- @fix
UPDATE VariableDeclaration SET kind = 'let';