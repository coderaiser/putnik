section('@select', select(left_node.id as 'left_type', from(BinaryExpression as 'bin', join(nodes as 'left_node', on(left_node.parent_id === bin.id)), where(inList(left_node.type, 'Identifier')))));
section('@fix', update(nodes, set(parent_id === ':call_id'), where(id === ':left_id' && type === ':left_type')));
