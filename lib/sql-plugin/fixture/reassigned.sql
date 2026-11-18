-- @report
SELECT 'Reassigned' AS message;

-- @select
SELECT id FROM reassigned_declarations;

-- @fix
UPDATE VariableDeclaration SET kind = 'let' WHERE id = :id;
