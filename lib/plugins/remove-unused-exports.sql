-- @scope project

-- @report
SELECT 'Export is never imported' AS message;

-- @select
SELECT
    export_declaration.id,
    export_declaration.file,
    'declaration' AS kind,
    export_declaration.id AS export_id,
    0 AS specifier_id,
    export_declaration.parent_id,
    export_declaration.parent_type,
    export_declaration.parent_field,
    exported.type AS declaration_type,
    exported.id AS declaration_id,
    export_declaration.start_line,
    export_declaration.start_col
FROM ExportNamedDeclaration export_declaration
JOIN nodes exported
    ON exported.file = export_declaration.file
    AND exported.parent_type = 'ExportNamedDeclaration'
    AND exported.parent_id = export_declaration.id
    AND exported.parent_field = 'declaration'
WHERE export_declaration.source_resolved IS NULL
    AND exported.type IN ('VariableDeclaration', 'FunctionDeclaration', 'ClassDeclaration')
    AND NOT EXISTS (
        SELECT 1
        FROM VariableDeclarator declarator
        WHERE declarator.file = exported.file
            AND declarator.parent_type = 'VariableDeclaration'
            AND declarator.parent_id = exported.id
            AND exported.type = 'VariableDeclaration'
            AND NOT EXISTS (
                SELECT 1 FROM Identifier id_node
                WHERE id_node.file = declarator.file
                    AND id_node.parent_type = 'VariableDeclarator'
                    AND id_node.parent_id = declarator.id
                    AND id_node.parent_field = 'id'
            )
    )
    AND NOT EXISTS (SELECT 1 FROM Entry WHERE Entry.file = export_declaration.file)
    AND NOT EXISTS (
        SELECT 1 FROM module_imports usage
        WHERE usage.target_file = export_declaration.file
            AND usage.name = '@all'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM module_exports exported_name
        JOIN module_imports usage
            ON usage.target_file = exported_name.file
            AND usage.name = exported_name.name
        WHERE exported_name.file = export_declaration.file
            AND exported_name.export_id = export_declaration.id
    )
UNION ALL
SELECT
    specifier.id,
    specifier.file,
    'specifier',
    export_declaration.id,
    specifier.id,
    0,
    '',
    '',
    '',
    0,
    specifier.start_line,
    specifier.start_col
FROM ExportSpecifier specifier
JOIN ExportNamedDeclaration export_declaration
    ON export_declaration.file = specifier.file
    AND export_declaration.id = specifier.parent_id
    AND specifier.parent_type = 'ExportNamedDeclaration'
JOIN Identifier exported_name
    ON exported_name.file = specifier.file
    AND exported_name.parent_id = specifier.id
    AND exported_name.parent_type = 'ExportSpecifier'
    AND exported_name.parent_field = 'exported'
WHERE export_declaration.source_resolved IS NULL
    AND NOT EXISTS (SELECT 1 FROM Entry WHERE Entry.file = specifier.file)
    AND NOT EXISTS (
        SELECT 1 FROM module_imports usage
        WHERE usage.target_file = specifier.file
            AND usage.name = '@all'
    )
    AND NOT EXISTS (
        SELECT 1 FROM module_imports usage
        WHERE usage.target_file = specifier.file
            AND usage.name = exported_name.name
    )
UNION ALL
SELECT
    default_declaration.id,
    default_declaration.file,
    'default',
    default_declaration.id,
    0,
    default_declaration.parent_id,
    default_declaration.parent_type,
    default_declaration.parent_field,
    exported.type,
    exported.id,
    default_declaration.start_line,
    default_declaration.start_col
FROM ExportDefaultDeclaration default_declaration
JOIN nodes exported
    ON exported.file = default_declaration.file
    AND exported.parent_type = 'ExportDefaultDeclaration'
    AND exported.parent_id = default_declaration.id
    AND exported.parent_field = 'declaration'
WHERE exported.type IN ('FunctionDeclaration', 'ClassDeclaration')
    AND EXISTS (
        SELECT 1 FROM Identifier id_node
        WHERE id_node.file = exported.file
            AND id_node.parent_type = exported.type
            AND id_node.parent_id = exported.id
            AND id_node.parent_field = 'id'
    )
    AND NOT EXISTS (SELECT 1 FROM Entry WHERE Entry.file = default_declaration.file)
    AND NOT EXISTS (
        SELECT 1 FROM module_imports usage
        WHERE usage.target_file = default_declaration.file
            AND usage.name IN ('@all', 'default')
    );

-- @fix
UPDATE VariableDeclaration
SET parent_id = :parent_id, parent_type = :parent_type, parent_field = :parent_field
WHERE file = :file AND id = :declaration_id AND :declaration_type = 'VariableDeclaration' AND :kind != 'specifier';
UPDATE FunctionDeclaration
SET parent_id = :parent_id, parent_type = :parent_type, parent_field = :parent_field
WHERE file = :file AND id = :declaration_id AND :declaration_type = 'FunctionDeclaration' AND :kind != 'specifier';
UPDATE ClassDeclaration
SET parent_id = :parent_id, parent_type = :parent_type, parent_field = :parent_field
WHERE file = :file AND id = :declaration_id AND :declaration_type = 'ClassDeclaration' AND :kind != 'specifier';
DELETE FROM ExportNamedDeclaration
WHERE file = :file AND id = :export_id AND :kind = 'declaration';
DELETE FROM ExportDefaultDeclaration
WHERE file = :file AND id = :export_id AND :kind = 'default';
DELETE FROM ExportSpecifier
WHERE file = :file AND id = :specifier_id AND :kind = 'specifier';
DELETE FROM ExportNamedDeclaration
WHERE file = :file AND id = :export_id AND :kind = 'specifier'
    AND NOT EXISTS (
        SELECT 1 FROM ExportSpecifier
        WHERE parent_type = 'ExportNamedDeclaration' AND parent_id = :export_id
    );
