import {types, operator} from 'putout';
import {
    findTypeList,
    getParameter,
    getTypeLeaf,
    getWhere,
    isUpdateOnNodes,
} from '../typed-update.js';
import {collectLeaves, isCallTo} from '../declarations.js';

const {replaceWith} = operator;

const {
    arrayExpression,
    binaryExpression,
    callExpression,
    cloneNode,
    identifier,
    logicalExpression,
    stringLiteral,
} = types;

export const report = () => `Expand 'update' on 'nodes' to a statement for each node type`;

export const include = () => [
    'CallExpression',
];

const getList = (path) => {
    if (!isUpdateOnNodes(path.node))
        return [];
    
    const leaf = getTypeLeaf(path.node);
    
    if (!leaf)
        return [];
    
    return findTypeList(path, getParameter(leaf));
};

export const filter = (path) => getList(path).length > 0;

const joinLeaves = (left, right) => logicalExpression('&&', left, right);

const createWhere = (where, typeLeaf, name) => {
    const replaceLeaf = (leaf) => {
        if (leaf === typeLeaf)
            return binaryExpression('===', stringLiteral(typeLeaf.right.value), stringLiteral(name));
        
        return cloneNode(leaf, true);
    };
    
    const leaves = collectLeaves(where.arguments[0]).map(replaceLeaf);
    
    return callExpression(identifier('where'), [
        leaves.reduce(joinLeaves),
    ]);
};

const createArgument = (where, typeLeaf, name) => (arg) => {
    if (arg === where)
        return createWhere(where, typeLeaf, name);
    
    return cloneNode(arg, true);
};

const createUpdate = (node) => (name) => {
    const where = getWhere(node);
    const typeLeaf = getTypeLeaf(node);
    const args = node.arguments.map(createArgument(where, typeLeaf, name));
    
    args[0] = identifier(name);
    
    return callExpression(identifier('update'), args);
};

export const fix = (path) => {
    const updates = getList(path).map(createUpdate(path.node));
    
    if (isCallTo(path.parentPath.node, 'section')) {
        replaceWith(path, arrayExpression(updates));
        return;
    }
    
    path.parent.elements.splice(path.key, 1, ...updates);
};
