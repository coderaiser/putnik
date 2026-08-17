import {types} from 'putout';
import {hasId} from '../columns.js';

const {
    identifier,
    isCallExpression,
    isIdentifier,
} = types;

const isStringLiteral = (a) => a && a.type === 'StringLiteral';

export const report = () => `Add 'id' as first column to @select`;

export const include = () => [
    'CallExpression',
];

export const filter = (path) => {
    if (!isCallExpression(path.node))
        return false;
    
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
    
    return !hasId(path.node.arguments);
};

export const fix = (path) => {
    path.node.arguments.unshift(identifier('id'));
};
