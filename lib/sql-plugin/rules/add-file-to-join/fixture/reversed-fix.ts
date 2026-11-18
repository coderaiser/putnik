section('@select', select(a.id, from(BinaryExpression as 'a', join(nodes as 'child', on(a.id === child.parent_id && child.file === a.file)))));
