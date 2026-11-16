-- @report
SELECT 'Use ''const'' when no reassign' AS message;

-- @select
SELECT
    declaration.id
FROM VariableDeclaration declaration
WHERE declaration.kind = 'let'
    AND COALESCE(declaration.declare, 0) = 0
    AND NOT EXISTS (
        SELECT 1
        FROM VariableDeclarator declarator
        WHERE declarator.file = declaration.file
            AND declarator.parent_type = 'VariableDeclaration'
            AND declarator.parent_id = declaration.id
            AND NOT EXISTS (
                SELECT 1
                FROM nodes init
                WHERE init.file = declarator.file
                    AND init.parent_type = 'VariableDeclarator'
                    AND init.parent_id = declarator.id
                    AND init.parent_field = 'init'
            )
            AND declaration.parent_type NOT IN ('ForInStatement', 'ForOfStatement')
    )
    AND NOT EXISTS (
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
SET kind = 'const'
WHERE id = :id;
