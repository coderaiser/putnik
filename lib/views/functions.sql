CREATE VIEW functions AS
SELECT
    f.id,
    f.file,
    f.async,
    f.start_line,
    f.start_col,
    name.id   AS name_id,
    name.name AS name
FROM FunctionDeclaration f
LEFT JOIN Identifier name
    ON name.parent_id = f.id
    AND name.parent_field = 'id'
