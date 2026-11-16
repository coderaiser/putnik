-- @report
SELECT 'Prefer let over const';

-- @select
SELECT id 
    FROM VariableDeclaration
    WHERE  kind = 'const';

-- @fix
UPDATE VariableDeclaration
    SET    kind = 'let'
    WHERE  kind = 'const';
