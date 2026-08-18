export const fix = () => section('@fix', update(
    VariableDeclaration,
    set(kind === 'let'),
    where(kind === 'const'),
));
