section('@select', select(bin.id, from(BinaryExpression as 'bin', join(Identifier as 'i', on(i.parent_id === bin.id && inList(i.parent_type, 'A', 'B'))))));
