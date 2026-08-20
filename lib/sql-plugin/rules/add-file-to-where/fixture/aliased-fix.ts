section('@select', select(bin.id, from(BinaryExpression as bin), join(Identifier as nan_id), on(nan_id.parent_id === bin.id)), where(bin.operator === '==='));
