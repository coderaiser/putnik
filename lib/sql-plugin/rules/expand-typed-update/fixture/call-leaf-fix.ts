section('@select', select(left_node.id as 'left_id', left_node.type as 'left_type', from(BinaryExpression as 'bin', join(nodes as 'left_node', on(left_node.parent_id === bin.id)), where(inList(left_node.type, 'Identifier', 'ThisExpression')))));
section('@fix', [
    update(Identifier, set(parent_id === ':call_id'), where(isNull(a) && id === ':left_id' && ':left_type' === 'Identifier')),
    update(ThisExpression, set(parent_id === ':call_id'), where(isNull(a) && id === ':left_id' && ':left_type' === 'ThisExpression')),
]);
