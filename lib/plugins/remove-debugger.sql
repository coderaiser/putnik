-- @report
SELECT 'Avoid ''debugger'' statement' AS message;

-- @select
SELECT
    id,
    parent_id,
    parent_type,
    parent_field,
    CASE
        WHEN parent_field IN ('body', 'consequent')
            AND parent_type IN ('Program', 'BlockStatement', 'StaticBlock', 'TSModuleBlock', 'SwitchCase')
        THEN 1
        ELSE 0
    END AS in_list
FROM DebuggerStatement;

-- @fix
INSERT INTO EmptyStatement (file, parent_id, parent_type, parent_field)
SELECT file, parent_id, parent_type, parent_field
FROM DebuggerStatement
WHERE id = :id AND :in_list = 0;
DELETE FROM DebuggerStatement
WHERE id = :id;
