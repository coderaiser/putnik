section('@select', select(bin.id, from(BinaryExpression as 'bin', join(Identifier as 'a', on(a.start_line > 1 && a.parent_id === bin.id)))));
