-- @select
SELECT
    id,
    start_line,
    start_col,
    parent_id,
    parent_type,
    parent_field
FROM BinaryExpression
WHERE operator = '==='
AND file = :file;

-- @report
SELECT 'Prefer Number.isNaN over === NaN' AS message;

-- @fix
DELETE FROM Identifier WHERE parent_id = :id AND name = 'NaN';

DELETE FROM BinaryExpression WHERE id = :id;

INSERT INTO CallExpression (file, parent_id, parent_type, parent_field)
VALUES (:file, :parent_id, :parent_type, :parent_field)
RETURNING id AS call_id;

INSERT INTO MemberExpression (file, parent_id, parent_type, parent_field)
VALUES (:file, :call_id, 'CallExpression', 'callee')
RETURNING id AS member_id;

INSERT INTO Identifier (file, name, parent_id, parent_type, parent_field)
VALUES (:file, 'Number', :member_id, 'MemberExpression', 'object');

INSERT INTO Identifier (file, name, parent_id, parent_type, parent_field)
VALUES (:file, 'isNaN', :member_id, 'MemberExpression', 'property');

UPDATE Identifier
SET parent_id = :call_id,
    parent_type = 'CallExpression',
    parent_field = 'arguments.0'
WHERE parent_id = :id
AND name != 'NaN';