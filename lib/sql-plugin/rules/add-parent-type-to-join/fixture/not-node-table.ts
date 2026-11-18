section('@select', select(u.id, from(module_imports as 'u', join(Identifier as 'a', on(a.parent_id === u.id)))));
