section('@select', select(a.id, from(BinaryExpression as 'a', join(nodes as 'child', on(child.start_line > 1 && child.parent_id === a.id)))));
