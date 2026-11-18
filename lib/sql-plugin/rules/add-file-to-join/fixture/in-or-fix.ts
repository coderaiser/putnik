section('@select', select(a.id, from(BinaryExpression as 'a', join(nodes as 'child', on(child.parent_id === a.id && child.file === a.file || child.name === 'x')))));
