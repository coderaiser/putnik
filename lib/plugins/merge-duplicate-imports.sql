-- @report
SELECT 'Avoid duplicate imports' AS message;

-- @select
SELECT
    src.id,
    src.id AS src_id,
    dst.id AS dst_id
FROM ImportDeclaration src
JOIN ImportDeclaration dst
    ON dst.file = src.file
    AND dst.source_value = src.source_value
    AND dst.id != src.id
    AND dst.start_line * 100000 + dst.start_col < src.start_line * 100000 + src.start_col
WHERE NOT EXISTS (
        SELECT 1 FROM ImportNamespaceSpecifier namespace
        WHERE namespace.parent_type = 'ImportDeclaration'
            AND namespace.parent_id IN (src.id, dst.id)
    )
    AND NOT EXISTS (
        SELECT 1 FROM ImportDeclaration earlier
        WHERE earlier.file = dst.file
            AND earlier.source_value = dst.source_value
            AND earlier.start_line * 100000 + earlier.start_col < dst.start_line * 100000 + dst.start_col
            AND NOT EXISTS (
                SELECT 1 FROM ImportNamespaceSpecifier namespace
                WHERE namespace.parent_type = 'ImportDeclaration'
                    AND namespace.parent_id = earlier.id
            )
    )
    AND NOT EXISTS (
        SELECT 1
        FROM ImportDefaultSpecifier first_default
        JOIN ImportDeclaration first_import
            ON first_import.id = first_default.parent_id
            AND first_default.parent_type = 'ImportDeclaration'
        JOIN ImportDefaultSpecifier second_default
            ON second_default.file = first_default.file
            AND second_default.id > first_default.id
            AND second_default.parent_type = 'ImportDeclaration'
        JOIN ImportDeclaration second_import
            ON second_import.id = second_default.parent_id
            AND second_import.source_value = first_import.source_value
        WHERE first_import.file = src.file
            AND first_import.source_value = src.source_value
    )
    AND NOT EXISTS (
        SELECT 1
        FROM ImportDefaultSpecifier type_default
        WHERE type_default.parent_type = 'ImportDeclaration'
            AND type_default.parent_id = src.id
            AND src.import_kind = 'type'
    );

-- @fix
UPDATE ImportSpecifier
SET import_kind = 'type'
WHERE parent_type = 'ImportDeclaration'
    AND parent_id = :dst_id
    AND EXISTS (SELECT 1 FROM ImportDeclaration WHERE id = :dst_id AND import_kind = 'type');
UPDATE ImportDeclaration
SET import_kind = 'value'
WHERE id = :dst_id
    AND import_kind = 'type';
UPDATE ImportSpecifier
SET import_kind = 'type'
WHERE parent_type = 'ImportDeclaration'
    AND parent_id = :src_id
    AND EXISTS (SELECT 1 FROM ImportDeclaration WHERE id = :src_id AND import_kind = 'type');
UPDATE ImportSpecifier
SET parent_id = :dst_id
WHERE parent_type = 'ImportDeclaration'
    AND parent_id = :src_id;
UPDATE ImportDefaultSpecifier
SET parent_id = :dst_id
WHERE parent_type = 'ImportDeclaration'
    AND parent_id = :src_id;
DELETE FROM ImportDeclaration
WHERE id = :src_id;
