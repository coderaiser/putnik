section('@select', select(a.id, from(BinaryExpression as 'a', join(Identifier as 'b', on(b.parent_id === a.id)), join(Identifier as 'c', on(c.parent_id === b.id)))));
