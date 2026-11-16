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
        SELECT 1
        FROM VariableDeclarator declarator
        JOIN Binding binding
            ON binding.file = declarator.file
            AND binding.declaration_type = 'VariableDeclarator'
            AND binding.declaration_id = declarator.id
        JOIN Reference reference
            ON reference.binding_id = binding.id
            AND reference.is_write = 1
        WHERE declarator.file = declaration.file
            AND declarator.parent_type = 'VariableDeclaration'
            AND declarator.parent_id = declaration.id
    );

-- @fix
UPDATE VariableDeclaration
SET kind = 'let'
WHERE id = :id;
