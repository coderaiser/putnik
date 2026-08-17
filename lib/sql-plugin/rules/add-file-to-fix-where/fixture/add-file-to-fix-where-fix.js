section('@fix', update(
    VariableDeclaration,
    set(kind === 'let'),
    where(file === ':file' && kind === 'const'),
));
