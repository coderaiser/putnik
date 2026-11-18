import {types} from 'putout';

const {
    isCallExpression,
    isIdentifier,
    isLogicalExpression,
    isMemberExpression,
    isTSAsExpression,
    isTSLiteralType,
} = types;

export const isCallTo = (node, name) => isCallExpression(node) && isIdentifier(node.callee, {
    name,
});

export const isColumn = (node, name) => {
    if (!isMemberExpression(node, {computed: false}))
        return false;
    
    if (!isIdentifier(node.object))
        return false;
    
    return isIdentifier(node.property, {
        name,
    });
};

export const getParentPair = ({left, right}) => {
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

export const getTable = (path, alias) => {
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

export const getTop = (current) => {
    while (isLogicalExpression(current.parentPath.node, {
        operator: '&&',
    }))
        current = current.parentPath;
    
    return current;
};

export const collectLeaves = (node, leaves = []) => {
    if (!isLogicalExpression(node, {operator: '&&'})) {
        leaves.push(node);
        return leaves;
    }
    
    collectLeaves(node.left, leaves);
    collectLeaves(node.right, leaves);
    
    return leaves;
};
