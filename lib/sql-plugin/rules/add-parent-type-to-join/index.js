import {types, operator} from 'putout';
import {NODE_COLUMNS} from '../../../node-columns.js';

const {replaceWith} = operator;

const {
    binaryExpression,
    identifier,
    isBinaryExpression,
    isCallExpression,
    isIdentifier,
    isLogicalExpression,
    isMemberExpression,
    isTSAsExpression,
    isTSLiteralType,
    logicalExpression,
    memberExpression,
    stringLiteral,
} = types;

export const report = () => `Add 'parent_type' to the comparison with the parent id`;

export const include = () => [
    'BinaryExpression',
];

const isCallTo = (node, name) => isCallExpression(node) && isIdentifier(node.callee, {
    name,
});

const isColumn = (node, name) => {
    if (!isMemberExpression(node, {computed: false}))
        return false;
    
    if (!isIdentifier(node.object))
        return false;
    
    return isIdentifier(node.property, {
        name,
    });
};

const getParentPair = ({left, right}) => {
    if (isColumn(left, 'parent_id') && isColumn(right, 'id'))
        return {
            child: left.object.name,
            parent: right.object.name,
        };
    
    if (isColumn(right, 'parent_id') && isColumn(left, 'id'))
        return {
            child: right.object.name,
            parent: left.object.name,
        };
    
    return null;
};

const getAliasName = ({typeAnnotation}) => {
    if (isTSLiteralType(typeAnnotation))
        return typeAnnotation.literal.value;
    
    return null;
};

const getDeclaration = (node) => {
    if (!isTSAsExpression(node))
        return null;
    
    if (!isIdentifier(node.expression))
        return null;
    
    return {
        alias: getAliasName(node),
        table: node.expression.name,
    };
};

const getJoinSource = (node) => {
    if (!isCallTo(node, 'join'))
        return null;
    
    return node.arguments[0];
};

const getSource = (node) => getJoinSource(node) || node;

const isDeclaration = (alias) => (declaration) => declaration && declaration.alias === alias;

const findTable = (from, alias) => {
    const declarations = from.arguments
        .map(getSource)
        .map(getDeclaration);
    
    const found = declarations.find(isDeclaration(alias));
    
    if (found)
        return found.table;
    
    return null;
};

const getTable = (path, alias) => {
    let current = path.parentPath;
    
    while (current) {
        const {node} = current;
        
        if (isCallTo(node, 'from')) {
            const table = findTable(node, alias);
            
            if (table)
                return table;
        }
        
        current = current.parentPath;
    }
    
    return null;
};

const getTop = (current) => {
    while (isLogicalExpression(current.parentPath.node, {
        operator: '&&',
    }))
        current = current.parentPath;
    
    return current;
};

const collectLeaves = (node, leaves = []) => {
    if (!isLogicalExpression(node, {operator: '&&'})) {
        leaves.push(node);
        return leaves;
    }
    
    collectLeaves(node.left, leaves);
    collectLeaves(node.right, leaves);
    
    return leaves;
};

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
