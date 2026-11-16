-- @report
SELECT 'Use ''isNaN'' instead of comparing' AS message;

-- @select
SELECT
    bin.id,
    bin.parent_id,
    bin.parent_type,
    bin.parent_field,
    left_node.id AS left_id,
    left_node.type AS left_type
FROM BinaryExpression bin
JOIN Identifier nan_id
    ON nan_id.parent_id = bin.id
    AND nan_id.parent_type = 'BinaryExpression'
    AND nan_id.parent_field = 'right'
    AND nan_id.name = 'NaN'
JOIN nodes left_node
    ON left_node.parent_id = bin.id
    AND left_node.parent_type = 'BinaryExpression'
    AND left_node.parent_field = 'left'
WHERE bin.operator = '==='
    AND left_node.type IN ('Identifier', 'MemberExpression', 'OptionalMemberExpression', 'CallExpression', 'ThisExpression');

-- @fix
DELETE FROM Identifier
WHERE parent_id = :id
    AND parent_type = 'BinaryExpression'
    AND name = 'NaN';
DELETE FROM BinaryExpression
WHERE id = :id;
INSERT INTO CallExpression (file, parent_id, parent_type, parent_field)
VALUES (:file, :parent_id, :parent_type, :parent_field)
RETURNING id AS call_id;
UPDATE Identifier
SET parent_id = :call_id, parent_type = 'CallExpression', parent_field = 'arguments'
WHERE id = :left_id AND :left_type = 'Identifier';
UPDATE MemberExpression
SET parent_id = :call_id, parent_type = 'CallExpression', parent_field = 'arguments'
WHERE id = :left_id AND :left_type = 'MemberExpression';
UPDATE OptionalMemberExpression
SET parent_id = :call_id, parent_type = 'CallExpression', parent_field = 'arguments'
WHERE id = :left_id AND :left_type = 'OptionalMemberExpression';
UPDATE ThisExpression
SET parent_id = :call_id, parent_type = 'CallExpression', parent_field = 'arguments'
WHERE id = :left_id AND :left_type = 'ThisExpression';
UPDATE CallExpression
SET parent_id = :call_id, parent_type = 'CallExpression', parent_field = 'arguments'
WHERE id = :left_id AND :left_type = 'CallExpression';
INSERT INTO MemberExpression (file, parent_id, parent_type, parent_field)
VALUES (:file, :call_id, 'CallExpression', 'callee')
RETURNING id AS member_id;
INSERT INTO Identifier (file, name, parent_id, parent_type, parent_field)
VALUES (:file, 'Number', :member_id, 'MemberExpression', 'object');
INSERT INTO Identifier (file, name, parent_id, parent_type, parent_field)
VALUES (:file, 'isNaN', :member_id, 'MemberExpression', 'property');
