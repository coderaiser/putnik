-- @select
SELECT
    bin.id,
    bin.parent_id,
    bin.parent_type,
    bin.parent_field,
    arg_id.name AS arg_name
FROM BinaryExpression bin
JOIN Identifier nan_id
    ON nan_id.parent_id = bin.id
    AND nan_id.name = 'NaN'
JOIN Identifier arg_id
    ON arg_id.parent_id = bin.id
    AND arg_id.id != nan_id.id
WHERE bin.operator = '===';

-- @report
SELECT 'Prefer Number.isNaN over === NaN' AS message;

-- @fix
DELETE FROM Identifier WHERE parent_id = :id AND name = 'NaN';
DELETE FROM BinaryExpression WHERE id = :id;
INSERT INTO CallExpression (file, parent_id, parent_type, parent_field)
VALUES (:file, :parent_id, :parent_type, :parent_field)
RETURNING id AS call_id;
UPDATE Identifier
SET parent_id = :call_id,
    parent_type = 'CallExpression',
    parent_field = 'arguments'
WHERE parent_id = :id
AND name = :arg_name;
INSERT INTO MemberExpression (file, parent_id, parent_type, parent_field)
VALUES (:file, :call_id, 'CallExpression', 'callee')
RETURNING id AS member_id;
INSERT INTO Identifier (file, name, parent_id, parent_type, parent_field)
VALUES (:file, 'Number', :member_id, 'MemberExpression', 'object');
INSERT INTO Identifier (file, name, parent_id, parent_type, parent_field)
VALUES (:file, 'isNaN', :member_id, 'MemberExpression', 'property');