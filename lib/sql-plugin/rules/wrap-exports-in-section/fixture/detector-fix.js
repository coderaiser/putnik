export const detector = () => section('@select', select(from(
    VariableDeclaration,
    where(kind === 'const'),
)));
