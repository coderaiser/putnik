CREATE VIEW reassigned_declarations AS
SELECT DISTINCT
    declarator.file AS file,
    declarator.parent_id AS id
FROM VariableDeclarator declarator
JOIN Binding binding
    ON binding.file = declarator.file
    AND binding.declaration_type = 'VariableDeclarator'
    AND binding.declaration_id = declarator.id
JOIN Reference reference
    ON reference.binding_id = binding.id
    AND reference.is_write = 1
WHERE declarator.parent_type = 'VariableDeclaration'
