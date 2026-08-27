import {operator, types} from 'putout';

const {
    compareAny,
    getTemplateValues,
    extract,
} = operator;

const {
    isCallExpression,
    isIdentifier,
    isStringLiteral,
    identifier,
    memberExpression,
    stringLiteral,
    binaryExpression,
    logicalExpression,
} = types;

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
    
    const fromPath = path.parentPath;
    
    if (!isCallExpression(fromPath.node))
        return false;
    
    if (!isIdentifier(fromPath.node.callee, {name: 'from'}))
        return false;
    
    const selectPath = fromPath.parentPath;
    
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
    const {__b} = getTemplateValues(path.parentPath, 'from(__a as __b)');
    
    const alias = __b ? extract(__b) : null;
    
    const fileNode = alias ? memberExpression(identifier(alias), identifier('file')) : identifier('file');
    
    const fileCondition = binaryExpression('===', fileNode, stringLiteral(':file'));
    const [condition] = path.node.arguments;
    
    path.node.arguments[0] = logicalExpression('&&', fileCondition, condition);
};
