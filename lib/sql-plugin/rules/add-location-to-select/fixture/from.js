section(
    '@select',
    select(
        id,
        from('VariableDeclaration'),
        where(kind = 'const'),
    ),
);
