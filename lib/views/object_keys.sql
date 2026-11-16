CREATE VIEW object_keys AS
SELECT
    property.file,
    'ObjectProperty'    AS type,
    property.id,
    property.parent_id,
    property.parent_type,
    property.start_line,
    property.start_col,
    CASE
        WHEN property.computed = 1 THEN '[' || key.name || ']'
        ELSE key.name
    END AS key
FROM ObjectProperty property
JOIN Identifier key
    ON key.parent_id = property.id
    AND key.parent_type = 'ObjectProperty'
    AND key.parent_field = 'key'
WHERE property.parent_type IN ('ObjectExpression', 'ObjectPattern')
    AND (property.parent_type = 'ObjectExpression' OR property.shorthand = 1)
UNION ALL
SELECT
    property.file,
    'ObjectProperty',
    property.id,
    property.parent_id,
    property.parent_type,
    property.start_line,
    property.start_col,
    '''' || key.value || ''''
FROM ObjectProperty property
JOIN StringLiteral key
    ON key.parent_id = property.id
    AND key.parent_type = 'ObjectProperty'
    AND key.parent_field = 'key'
WHERE property.parent_type = 'ObjectExpression'
UNION ALL
SELECT
    property.file,
    'ObjectProperty',
    property.id,
    property.parent_id,
    property.parent_type,
    property.start_line,
    property.start_col,
    '[' || object.name || '.' || member_property.name || ']'
FROM ObjectProperty property
JOIN MemberExpression key
    ON key.parent_id = property.id
    AND key.parent_type = 'ObjectProperty'
    AND key.parent_field = 'key'
JOIN Identifier object
    ON object.parent_id = key.id
    AND object.parent_type = 'MemberExpression'
    AND object.parent_field = 'object'
JOIN Identifier member_property
    ON member_property.parent_id = key.id
    AND member_property.parent_type = 'MemberExpression'
    AND member_property.parent_field = 'property'
WHERE property.parent_type = 'ObjectExpression'
    AND key.computed = 0
UNION ALL
SELECT
    spread.file,
    'SpreadElement',
    spread.id,
    spread.parent_id,
    spread.parent_type,
    spread.start_line,
    spread.start_col,
    '...' || argument.name
FROM SpreadElement spread
JOIN Identifier argument
    ON argument.parent_id = spread.id
    AND argument.parent_type = 'SpreadElement'
    AND argument.parent_field = 'argument'
WHERE spread.parent_type = 'ObjectExpression';
