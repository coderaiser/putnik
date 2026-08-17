section('@fix', [
    deleteFrom(from(Identifier), where(file === ':file' && parent_id === ':id')),
    update(BinaryExpression, set(operator === '==='), where(file === ':file' && id === ':id')),
]);
