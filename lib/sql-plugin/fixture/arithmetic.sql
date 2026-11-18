-- @report
SELECT 'Later' AS message;

-- @select
SELECT
    last.id
FROM Identifier first
JOIN Identifier last
    ON last.file = first.file
WHERE last.start_line * 100000 + last.start_col > first.start_line * 100000 + first.start_col;

-- @fix
DELETE FROM Identifier WHERE id = :id;
