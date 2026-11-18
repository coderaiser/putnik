section('@select', select(bin.id, from(a.b as 'bin', join(Identifier as 'a', on(a.parent_id === bin.id)))));
