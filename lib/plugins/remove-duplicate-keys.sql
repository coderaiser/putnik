-- @report
SELECT 'Avoid duplicate keys: ''' || :key || '''' AS message;

-- @select
SELECT
    first.type,
    first.id,
    first.key
FROM object_keys first
WHERE EXISTS (
    SELECT 1 FROM object_keys last
    WHERE last.file = first.file
        AND last.parent_type = first.parent_type
        AND last.parent_id = first.parent_id
        AND last.key = first.key
        AND last.start_line * 100000 + last.start_col > first.start_line * 100000 + first.start_col
);

-- @fix
DELETE FROM ObjectProperty
WHERE id = :id AND :type = 'ObjectProperty';
DELETE FROM SpreadElement
WHERE id = :id AND :type = 'SpreadElement';
