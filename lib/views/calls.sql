CREATE VIEW calls AS
SELECT
    call.id,
    call.file,
    object.id   AS object_id,
    object.name AS object_name,
    property.id   AS property_id,
    property.name AS property_name
FROM CallExpression call
LEFT JOIN MemberExpression member
    ON member.parent_id = call.id
LEFT JOIN Identifier object
    ON object.parent_id = member.id
    AND object.parent_field = 'object'
LEFT JOIN Identifier property
    ON property.parent_id = member.id
    AND property.parent_field = 'property'
