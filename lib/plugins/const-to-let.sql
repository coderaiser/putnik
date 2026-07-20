-- @select
SELECT id, start_line, start_col
FROM   VariableDeclaration
WHERE  file = :file
AND    kind = 'const';

-- @report
SELECT 'Prefer let over const' AS message,
       start_line AS line,
       start_col  AS col
FROM   VariableDeclaration
WHERE  file = :file
AND    kind = 'const';

-- @fix
UPDATE VariableDeclaration
SET    kind = 'let'
WHERE  file = :file
AND    kind = 'const';
