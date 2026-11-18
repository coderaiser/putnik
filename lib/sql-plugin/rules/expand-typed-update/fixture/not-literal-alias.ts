section('@select', select(left_node.type as left_type, from(Identifier as 'left_node', where(inList(left_node.type, 'Identifier')))));
section('@fix', update(nodes, set(parent_id === ':call_id'), where(id === ':left_id' && type === ':left_type')));
