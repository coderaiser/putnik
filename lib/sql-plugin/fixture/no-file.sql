-- @report
SELECT 'hello';

-- @select
SELECT id, start_line, start_col FROM VariableDeclaration WHERE kind = 'const';

-- @fix
UPDATE VariableDeclaration SET kind = 'let' WHERE kind = 'const';