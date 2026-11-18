import {types} from 'putout';
import {collectLeaves, isCallTo} from './declarations.js';

const {
    isBinaryExpression,
    isIdentifier,
    isMemberExpression,
    isStringLiteral,
    isTSAsExpression,
    isTSLiteralType,
} = types;

export const isTypeParameter = (leaf) => {
    if (!isBinaryExpression(leaf, {operator: '==='}))
        return false;
    
    if (!isIdentifier(leaf.left, {name: 'type'}))
        return false;
    
    return isStringLiteral(leaf.right) && leaf.right.value.startsWith(':');
};

const isWhere = (node) => isCallTo(node, 'where');
const getValue = (node) => node.value;
const isProgramPath = (path) => path.isProgram();

export const isUpdateOnNodes = (node) => isCallTo(node, 'update') && isIdentifier(node.arguments[0], {
    name: 'nodes',
});

export const getWhere = (node) => node.arguments.find(isWhere);

export const getTypeLeaf = (node) => {
    const where = getWhere(node);
    
    if (!where)
        return null;
    
    return collectLeaves(where.arguments[0]).find(isTypeParameter);
};

export const getParameter = (leaf) => leaf.right.value;

const isTypeOf = (node, alias) => {
    if (!isMemberExpression(node))
        return false;
    
    return isIdentifier(node.object, {
        name: alias,
    }) && isIdentifier(node.property, {
        name: 'type',
    });
};

const isTypeColumn = (parameter) => (arg) => {
    if (!isTSAsExpression(arg) || !isTSLiteralType(arg.typeAnnotation))
        return false;
    
    if (arg.typeAnnotation.literal.value !== parameter.slice(1))
        return false;
    
    const {expression} = arg;
    
    return isMemberExpression(expression) && isIdentifier(expression.property, {
        name: 'type',
    });
};

const isSelectSection = (path) => {
    if (!isCallTo(path.node, 'section'))
        return false;
    
    const [tag] = path.node.arguments;
    
    return isStringLiteral(tag, {
        value: '@select',
    });
};

const readList = (selectPath, alias) => {
    let list = [];
    
    selectPath.traverse({
        CallExpression(path) {
            const [first, ...rest] = path.node.arguments;
            
            if (!isCallTo(path.node, 'inList') || !isTypeOf(first, alias))
                return;
            
            list = rest.map(getValue);
            path.stop();
        },
    });
    
    return list;
};

export const findTypeList = (path, parameter) => {
    const program = path.findParent(isProgramPath);
    const isColumn = isTypeColumn(parameter);
    let list = [];
    
    program.traverse({
        CallExpression(selectPath) {
            if (!isCallTo(selectPath.node, 'select') || !selectPath.findParent(isSelectSection))
                return;
            
            const column = selectPath.node.arguments.find(isColumn);
            
            if (!column)
                return;
            
            const found = readList(selectPath, column.expression.object.name);
            
            if (found.length)
                list = found;
        },
    });
    
    return list;
};
