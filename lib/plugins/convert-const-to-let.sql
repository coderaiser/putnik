-- @report
SELECT 'Use ''let'' when reassign' AS message;

-- @select
SELECT
    declaration.id
FROM VariableDeclaration declaration
WHERE declaration.kind = 'const'
    AND declaration.parent_type != 'ExportNamedDeclaration'
    AND COALESCE(declaration.declare, 0) = 0
    AND EXISTS (
        SELECT 1 FROM reassigned_declarations reassigned
        WHERE reassigned.file = declaration.file
            AND reassigned.id = declaration.id
    );

-- @fix
UPDATE VariableDeclaration
SET kind = 'let'
WHERE id = :id;
