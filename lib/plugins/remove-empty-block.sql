-- @report
SELECT 'Avoid useless empty blocks' AS message;

-- @select
SELECT
    block.id
FROM BlockStatement block
WHERE block.parent_type IN ('Program', 'BlockStatement', 'StaticBlock')
    AND block.parent_field = 'body'
    AND NOT EXISTS (
        SELECT 1 FROM nodes child
        WHERE child.file = block.file
            AND child.parent_type = 'BlockStatement'
            AND child.parent_id = block.id
    )
    AND NOT EXISTS (
        SELECT 1 FROM Comments comment
        WHERE comment.file = block.file
            AND comment.node_type = 'BlockStatement'
            AND comment.node_id = block.id
    );

-- @fix
DELETE FROM BlockStatement
WHERE id = :id;
