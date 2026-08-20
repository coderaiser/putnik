import {types, operator} from 'putout';
import {hasStartLine} from '../columns.js';

const {
    getTemplateValues,
    extract,
} = operator;

const {
    identifier,
    isCallExpression,
    isIdentifier,
    isStringLiteral,
    memberExpression,
} = types;

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
    
    if (index === -1) {
        args.splice(length, 0, startLine, startCol);
        return;
    }
    
    const {__b} = getTemplateValues(args[index], 'from(__a as __b)');
    
    if (__b) {
        const value = extract(__b);
        
        const startLineMember = memberExpression(identifier(value), startLine);
        const startColMember = memberExpression(identifier(value), startCol);
        
        args.splice(index, 0, startLineMember, startColMember);
        
        return;
    }
    
    args.splice(index, 0, startLine, startCol);
};

const isFrom = (arg) => {
    if (!isCallExpression(arg))
        return false;
    
    return isIdentifier(arg.callee, {
        name: 'from',
    });
};
