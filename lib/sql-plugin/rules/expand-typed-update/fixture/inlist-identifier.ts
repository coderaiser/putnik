section('@select', select(left_node.id as 'left_id', left_node.type as 'left_type', from(BinaryExpression as 'bin', join(nodes as 'left_node', on(left_node.parent_id === bin.id)), where(inList(left_id, 'Identifier')))));
section('@fix', update(nodes, set(parent_id === ':call_id'), where(id === ':left_id' && type === ':left_type')));
