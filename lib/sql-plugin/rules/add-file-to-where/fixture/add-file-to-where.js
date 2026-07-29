__putout_processor_sql([
    select('*', from(users), where(kind === 'const')),
]);

__putout_processor_sql([
    select('*', from(users), where(kind === 'const' && file===":file")),
]);

__putout_processor_sql([
    select('*', from(users), where(file===":file" && kind === 'const'))
]);

__putout_processor_sql([
    select('*', from(users), where(file===":file"))
]);