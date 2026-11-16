-- @report
SELECT 'Avoid ''console'' call' AS message;

-- @select
SELECT
    statement.id,
    statement.parent_id,
    statement.parent_type,
    statement.parent_field,
    CASE
        WHEN statement.parent_field IN ('body', 'consequent')
            AND statement.parent_type IN ('Program', 'BlockStatement', 'StaticBlock', 'TSModuleBlock', 'SwitchCase')
        THEN 1
        ELSE 0
    END AS in_list
FROM ExpressionStatement statement
JOIN CallExpression call
    ON call.parent_id = statement.id
    AND call.parent_type = 'ExpressionStatement'
    AND call.parent_field = 'expression'
JOIN MemberExpression callee
    ON callee.parent_id = call.id
    AND callee.parent_type = 'CallExpression'
    AND callee.parent_field = 'callee'
JOIN Identifier object
    ON object.parent_id = callee.id
    AND object.parent_type = 'MemberExpression'
    AND object.parent_field = 'object'
    AND object.name = 'console'
WHERE NOT EXISTS (
    SELECT 1 FROM Binding declared
    WHERE declared.file = statement.file
        AND declared.name = 'console'
);

-- @fix
INSERT INTO EmptyStatement (file, parent_id, parent_type, parent_field)
SELECT file, parent_id, parent_type, parent_field
FROM ExpressionStatement
WHERE id = :id AND :in_list = 0;
DELETE FROM ExpressionStatement
WHERE id = :id;
