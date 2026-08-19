export const detector = () =>
    select(from(VariableDeclaration), where(kind === 'const'));
