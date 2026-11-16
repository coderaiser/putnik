CREATE VIEW module_imports AS
SELECT
    raw.file,
    target.file AS target_file,
    raw.name
FROM (
SELECT
    declaration.file,
    declaration.source_resolved,
    imported.name AS name
FROM ImportSpecifier specifier
JOIN ImportDeclaration declaration
    ON declaration.file = specifier.file
    AND declaration.id = specifier.parent_id
    AND specifier.parent_type = 'ImportDeclaration'
JOIN Identifier imported
    ON imported.file = specifier.file
    AND imported.parent_id = specifier.id
    AND imported.parent_type = 'ImportSpecifier'
    AND imported.parent_field = 'imported'
WHERE declaration.source_resolved IS NOT NULL
UNION ALL
SELECT
    declaration.file,
    declaration.source_resolved,
    'default'
FROM ImportDefaultSpecifier specifier
JOIN ImportDeclaration declaration
    ON declaration.file = specifier.file
    AND declaration.id = specifier.parent_id
    AND specifier.parent_type = 'ImportDeclaration'
WHERE declaration.source_resolved IS NOT NULL
UNION ALL
SELECT
    declaration.file,
    declaration.source_resolved,
    '@all'
FROM ImportNamespaceSpecifier specifier
JOIN ImportDeclaration declaration
    ON declaration.file = specifier.file
    AND declaration.id = specifier.parent_id
    AND specifier.parent_type = 'ImportDeclaration'
WHERE declaration.source_resolved IS NOT NULL
UNION ALL
SELECT
    declaration.file,
    declaration.source_resolved,
    local.name
FROM ExportSpecifier specifier
JOIN ExportNamedDeclaration declaration
    ON declaration.file = specifier.file
    AND declaration.id = specifier.parent_id
    AND specifier.parent_type = 'ExportNamedDeclaration'
JOIN Identifier local
    ON local.file = specifier.file
    AND local.parent_id = specifier.id
    AND local.parent_type = 'ExportSpecifier'
    AND local.parent_field = 'local'
WHERE declaration.source_resolved IS NOT NULL
UNION ALL
SELECT
    file,
    source_resolved,
    '@all'
FROM ExportAllDeclaration
WHERE source_resolved IS NOT NULL
UNION ALL
SELECT
    file,
    source_resolved,
    '@all'
FROM ImportExpression
WHERE source_resolved IS NOT NULL
UNION ALL
SELECT
    file,
    source_resolved,
    '@all'
FROM CallExpression
WHERE source_resolved IS NOT NULL
) raw
JOIN Program target
    ON target.file = raw.source_resolved
    OR substr(target.file, 1, length(raw.source_resolved) + 1) = raw.source_resolved || '.'
    OR substr(target.file, 1, length(raw.source_resolved) + 7) = raw.source_resolved || '/index.';
