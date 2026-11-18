section('@select', select(bin.id, from(BinaryExpression as 'bin', join(Identifier as 'a', on(a.parent_id === bin.id && inList(b.parent_type, 'A') && a.parent_type === 'BinaryExpression')))));
