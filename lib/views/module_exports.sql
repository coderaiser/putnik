CREATE VIEW module_exports AS
SELECT
    declaration.file,
    declaration.id AS export_id,
    id_node.name AS name
FROM ExportNamedDeclaration declaration
JOIN VariableDeclaration variable_declaration
    ON variable_declaration.file = declaration.file
    AND variable_declaration.parent_type = 'ExportNamedDeclaration'
    AND variable_declaration.parent_id = declaration.id
JOIN VariableDeclarator declarator
    ON declarator.file = declaration.file
    AND declarator.parent_type = 'VariableDeclaration'
    AND declarator.parent_id = variable_declaration.id
JOIN Identifier id_node
    ON id_node.file = declaration.file
    AND id_node.parent_type = 'VariableDeclarator'
    AND id_node.parent_id = declarator.id
    AND id_node.parent_field = 'id'
WHERE declaration.source_resolved IS NULL
UNION ALL
SELECT
    declaration.file,
    declaration.id,
    id_node.name
FROM ExportNamedDeclaration declaration
JOIN FunctionDeclaration function_declaration
    ON function_declaration.file = declaration.file
    AND function_declaration.parent_type = 'ExportNamedDeclaration'
    AND function_declaration.parent_id = declaration.id
JOIN Identifier id_node
    ON id_node.file = declaration.file
    AND id_node.parent_type = 'FunctionDeclaration'
    AND id_node.parent_id = function_declaration.id
    AND id_node.parent_field = 'id'
WHERE declaration.source_resolved IS NULL
UNION ALL
SELECT
    declaration.file,
    declaration.id,
    id_node.name
FROM ExportNamedDeclaration declaration
JOIN ClassDeclaration class_declaration
    ON class_declaration.file = declaration.file
    AND class_declaration.parent_type = 'ExportNamedDeclaration'
    AND class_declaration.parent_id = declaration.id
JOIN Identifier id_node
    ON id_node.file = declaration.file
    AND id_node.parent_type = 'ClassDeclaration'
    AND id_node.parent_id = class_declaration.id
    AND id_node.parent_field = 'id'
WHERE declaration.source_resolved IS NULL;
