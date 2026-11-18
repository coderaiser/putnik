section('@select', select(p.id, from(nodes as 'p', join(Identifier as 'a', on(a.parent_id === p.id)))));
