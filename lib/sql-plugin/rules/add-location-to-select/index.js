import {types} from 'putout';
import {hasStartLine} from '../columns.js';

const {
    identifier,
    isCallExpression,
    isIdentifier,
} = types;

const isStringLiteral = (a) => a && a.type === 'StringLiteral';

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
    const args = path.node.arguments;
    const fromIndex = args.findIndex((arg) => isCallExpression(arg) && isIdentifier(arg.callee, {
        name: 'from',
    }));
    
    const insertAt = fromIndex === -1 ? args.length : fromIndex;
    
    args.splice(insertAt, 0, identifier('start_line'), identifier('start_col'));
};
