import {types, operator} from 'putout';
import {NODE_COLUMNS} from '../../../node-columns.js';
import {
    collectLeaves,
    getParentPair,
    getTable,
    getTop,
    isCallTo,
    isColumn,
} from '../declarations.js';

const {replaceWith} = operator;

const {
    binaryExpression,
    identifier,
    isBinaryExpression,
    logicalExpression,
    memberExpression,
    stringLiteral,
} = types;

export const report = () => `Add 'parent_type' to the comparison with the parent id`;

export const include = () => [
    'BinaryExpression',
];

const isParentTypeLeaf = (child) => (leaf) => {
    if (isBinaryExpression(leaf, {operator: '==='}))
        return isColumn(leaf.left, 'parent_type') && leaf.left.object.name === child;
    
    if (!isCallTo(leaf, 'inList'))
        return false;
    
    const [first] = leaf.arguments;
    
    return isColumn(first, 'parent_type') && first.object.name === child;
};

export const filter = (path) => {
    const {node} = path;
    
    if (node.operator !== '===')
        return false;
    
    const pair = getParentPair(node);
    
    if (!pair)
        return false;
    
    const table = getTable(path, pair.parent);
    
    if (!table || !Object.hasOwn(NODE_COLUMNS, table))
        return false;
    
    const leaves = collectLeaves(getTop(path).node);
    
    return !leaves.some(isParentTypeLeaf(pair.child));
};

export const fix = (path) => {
    const {child, parent} = getParentPair(path.node);
    const table = getTable(path, parent);
    const top = getTop(path);
    
    const condition = binaryExpression('===', memberExpression(identifier(child), identifier('parent_type')), stringLiteral(table));
    
    replaceWith(top, logicalExpression('&&', top.node, condition));
};
