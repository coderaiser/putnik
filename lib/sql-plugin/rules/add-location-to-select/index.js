import {types} from 'putout';
import {hasStartLine} from '../columns.js';

const {
    identifier,
    isCallExpression,
    isIdentifier,
    isStringLiteral,
    memberExpression,
} = types;

const getAlias = (fromArg) => {
    if (!fromArg)
        return null;
    
    const [firstFromArg] = fromArg.arguments ?? [];
    
    if (firstFromArg?.type !== 'TSAsExpression')
        return null;
    
    const t = firstFromArg.typeAnnotation;
    
    if (!t)
        return null;
    
    if (t.type === 'StringLiteral')
        return t.value;
    
    if (t.type === 'Identifier')
        return t.name;
    
    if (t.type === 'TSLiteralType')
        return t.literal?.value ?? null;
    
    return t.typeName?.name ?? null;
};

export const report = () => `Add 'start_line', 'start_col' to @select`;

export const include = () => [
    'CallExpression',
];

export const filter = (path) => {
    if (!isIdentifier(path.node.callee, {name: 'select'}))
        return false;
    
    const parent = path.parentPath;
    
    if (!isCallExpression(parent.node))
        return false;
    
    if (!isIdentifier(parent.node.callee, {name: 'section'}))
        return false;
    
    const [tag] = parent.node.arguments;
    
    if (!isStringLiteral(tag) || tag.value !== '@select')
        return false;
    
    return !hasStartLine(path.node.arguments);
};

export const fix = (path) => {
    const startLine = identifier('start_line');
    const startCol = identifier('start_col');
    
    const args = path.node.arguments;
    
    const {length} = args;
    const index = args.findIndex(isFrom);
    
    const fromArg = index !== -1 ? args[index] : null;
    const alias = getAlias(fromArg);
    
    const insertAt = index === -1 ? args.length : index;
    
    if (alias) {
        const startLineMember = memberExpression(identifier(alias), startLine);
        const startColMember = memberExpression(identifier(alias), startCol);
        
        args.splice(insertAt, 0, startLineMember, startColMember);
        
        return;
    }
    
    args.splice(insertAt, 0, startLine, startCol);
};

const isFrom = (arg) => {
    if (!isCallExpression(arg))
        return false;
    
    return isIdentifier(arg.callee, {
        name: 'from',
    });
};
