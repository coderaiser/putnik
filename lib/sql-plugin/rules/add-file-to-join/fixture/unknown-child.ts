section('@select', select(a.id, from(BinaryExpression as 'a', where(child.parent_id === a.id))));
