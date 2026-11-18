section('@select', select(id, from(BinaryExpression, join(Identifier, on(Identifier.parent_id === BinaryExpression.id)))));
