export const pluginConstToLet = {
    message: 'Prefer let over const',
    
    include: () => [
        'VariableDeclaration',
    ],
    
    fix(node) {
        node.kind = 'let';
    },
};
