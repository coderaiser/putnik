__putout_processor_sql([
    section('@select', select(bin.id, bin.start_line, bin.start_col, bin.parent_id, bin.parent_type, bin.parent_field, arg_id.name as 'arg_name', from(BinaryExpression as 'bin', join(Identifier as 'nan_id', on(nan_id.parent_id === bin.id && nan_id.name === 'NaN')), join(Identifier as 'arg_id', on(arg_id.parent_id === bin.id && arg_id.id !== nan_id.id))), where(bin.operator === '==='))),
]);
