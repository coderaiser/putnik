import {operator, types} from 'putout';

const {
    compareAny,
    getTemplateValues,
} = operator;

const {
    isCallExpression,
    isIdentifier,
    identifier,
    memberExpression,
    stringLiteral,
    binaryExpression,
    logicalExpression,
} = types;

const isStringLiteral = (a) => a && a.type === 'StringLiteral';

const hasFileBinding = (__a) => compareAny(__a, [
    'file === ":file"',
    'file === ":file" && __',
    '__ && file === ":file"',
    '__.file === ":file"',
    '__.file === ":file" && __',
    '__ && __.file === ":file"',
]);

export const report = () => 'Add "file = :file" to WHERE';

export const include = () => [
    'CallExpression',
];

export const filter = (path) => {
    if (!isIdentifier(path.node.callee, {name: 'where'}))
        return false;
    
    const parentNode = path.parentPath.node;
    const parentIsFrom = isCallExpression(parentNode) &&
        isIdentifier(parentNode.callee, {name: 'from'});
    
    const selectPath = parentIsFrom
        ? path.parentPath.parentPath
        : path.parentPath;
    
    if (!isCallExpression(selectPath.node))
        return false;
    
    if (!isIdentifier(selectPath.node.callee, {name: 'select'}))
        return false;
    
    const sectionPath = selectPath.parentPath;
    
    if (!isCallExpression(sectionPath.node))
        return false;
    
    if (!isIdentifier(sectionPath.node.callee, {name: 'section'}))
        return false;
    
    const [tag] = sectionPath.node.arguments;
    
    if (!isStringLiteral(tag) || tag.value !== '@select')
        return false;
    
    const [whereArg] = path.node.arguments;
    
    if (!whereArg)
        return false;
    
    return !hasFileBinding(whereArg);
};

export const fix = (path) => {
    const parentNode = path.parentPath.node;
    const parentIsFrom = isCallExpression(parentNode) &&
        isIdentifier(parentNode.callee, {name: 'from'});
    
    const alias = parentIsFrom
        ? getTemplateValues(parentNode, 'from(__a as __b)')?.__b?.literal?.value
        : null;
    
    const fileNode = alias
        ? memberExpression(identifier(alias), identifier('file'))
        : identifier('file');
    
    const fileCondition = binaryExpression('===', fileNode, stringLiteral(':file'));
    const [condition] = path.node.arguments;
    
    path.node.arguments[0] = logicalExpression('&&', fileCondition, condition);
};
