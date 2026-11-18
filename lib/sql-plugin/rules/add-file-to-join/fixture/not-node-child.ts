section('@select', select(a.id, from(BinaryExpression as 'a', join(module_imports as 'child', on(child.parent_id === a.id)))));
