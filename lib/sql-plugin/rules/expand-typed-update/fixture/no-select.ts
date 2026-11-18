section('@fix', update(nodes, set(parent_id === ':call_id'), where(id === ':left_id' && type === ':left_type')));
