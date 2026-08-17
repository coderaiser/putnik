section('@fix', [
    deleteFrom(from(Identifier), where(parent_id === ':id')),
    update(BinaryExpression, set(operator === '==='), where(id === ':id')),
]);
