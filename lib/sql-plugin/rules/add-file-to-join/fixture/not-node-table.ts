section('@select', select(u.id, from(module_imports as 'u', join(nodes as 'child', on(child.parent_id === u.id)))));
