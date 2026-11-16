-- @report
SELECT '''' || :name || ''' is defined but never used' AS message;

-- @select
SELECT
    declarator.id,
    declaration.id AS declaration_id,
    binding.name AS name
FROM Binding binding
JOIN VariableDeclarator declarator
    ON declarator.file = binding.file
    AND declarator.id = binding.declaration_id
    AND binding.declaration_type = 'VariableDeclarator'
JOIN VariableDeclaration declaration
    ON declaration.file = declarator.file
    AND declaration.id = declarator.parent_id
    AND declarator.parent_type = 'VariableDeclaration'
JOIN Identifier target
    ON target.file = binding.file
    AND target.id = binding.node_id
    AND target.parent_type = 'VariableDeclarator'
    AND target.parent_id = declarator.id
    AND target.parent_field = 'id'
WHERE binding.kind IN ('var', 'let', 'const')
    AND declaration.parent_type != 'ExportNamedDeclaration'
    AND NOT EXISTS (
        SELECT 1 FROM Reference reference
        WHERE reference.binding_id = binding.id
            AND reference.is_write = 0
    );

-- @fix
DELETE FROM VariableDeclarator
WHERE id = :id;
DELETE FROM VariableDeclaration
WHERE id = :declaration_id
    AND NOT EXISTS (
        SELECT 1 FROM VariableDeclarator
        WHERE parent_type = 'VariableDeclaration'
            AND parent_id = :declaration_id
    );
