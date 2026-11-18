section('@select', select(first.id, from(Identifier as 'first', join(nodes as 'last', on(last.parent_id === first.parent_id)))));
