section('@select', select(bin.id, from(BinaryExpression as 'bin', join(Identifier as 'a', on(a.start_line === bin.id)))));
