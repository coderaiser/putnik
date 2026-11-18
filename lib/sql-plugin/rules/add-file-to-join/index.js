import {types, operator} from 'putout';
import {NODE_COLUMNS} from '../../../node-columns.js';
import {
    collectLeaves,
    getParentPair,
    getTable,
    getTop,
} from '../declarations.js';

const {replaceWith} = operator;

const {
    binaryExpression,
    identifier,
    isBinaryExpression,
    isIdentifier,
    isMemberExpression,
    logicalExpression,
    memberExpression,
} = types;

export const report = () => `Add 'file' to the comparison with the parent id`;

export const include = () => [
    'BinaryExpression',
];

const isNodeTable = (table) => table === 'nodes' || Object.hasOwn(NODE_COLUMNS, table);

const isFileOf = (child) => (node) => {
    if (!isMemberExpression(node, {computed: false}))
        return false;
    
    return isIdentifier(node.object, {
        name: child,
    }) && isIdentifier(node.property, {
        name: 'file',
    });
};

const isFileLeaf = (child) => (leaf) => {
    if (!isBinaryExpression(leaf, {operator: '==='}))
        return false;
    
    const isFile = isFileOf(child);
    
    return isFile(leaf.left) || isFile(leaf.right);
};

export const filter = (path) => {
    const {node} = path;
    
    if (node.operator !== '===')
        return false;
    
    const pair = getParentPair(node);
    
    if (!pair)
        return false;
    
    const childTable = getTable(path, pair.child);
    const parentTable = getTable(path, pair.parent);
    
    if (!childTable || !parentTable)
        return false;
    
    if (!isNodeTable(childTable) || !isNodeTable(parentTable))
        return false;
    
    const leaves = collectLeaves(getTop(path).node);
    
    return !leaves.some(isFileLeaf(pair.child));
};

export const fix = (path) => {
    const {child, parent} = getParentPair(path.node);
    const top = getTop(path);
    
    const condition = binaryExpression('===', memberExpression(identifier(child), identifier('file')), memberExpression(identifier(parent), identifier('file')));
    
    replaceWith(top, logicalExpression('&&', top.node, condition));
};
