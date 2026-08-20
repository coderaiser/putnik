export const detector = () =>
    select(from(VariableDeclaration, where(kind === 'const')));

export const report = () => `Prefer let over const`;
