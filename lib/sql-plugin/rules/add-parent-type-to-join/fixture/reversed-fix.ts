section('@select', select(bin.id, from(BinaryExpression as 'bin', join(Identifier as 'nan_id', on(bin.id === nan_id.parent_id && nan_id.parent_type === 'BinaryExpression')))));
