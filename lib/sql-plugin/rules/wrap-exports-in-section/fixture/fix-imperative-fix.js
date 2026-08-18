export const fix = () => section('@fix', withNamed(call = insert(into(
    CallExpression,
    [file, parent_id],
    values(':file', ':parent_id'),
), returning(id)), insert(into(
    MemberExpression,
    [file, parent_id],
    select(':file', id, from(call)),
))));
