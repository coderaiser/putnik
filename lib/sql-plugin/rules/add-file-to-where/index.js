import {operator, types} from 'putout';

const {compareAny} = operator;
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

const getPrimaryAlias = (selectArgs) => {
    const fromArg = selectArgs.find((a) => isCallExpression(a) && isIdentifier(a.callee, {
        name: 'from',
    }));
    
    if (!fromArg)
        return null;
    
    const [firstFromArg] = fromArg.arguments;
    
    if (!firstFromArg)
        return null;
    
    if (!isCallExpression(firstFromArg))
        return null;
    
    if (!isIdentifier(firstFromArg.callee, {name: 'as'}))
        return null;
    
    if (!firstFromArg.arguments[1])
        return null;
    
    return firstFromArg.arguments[1].name;
};

export const report = () => 'Add "file = :file" to WHERE';

export const include = () => [
    'CallExpression',
];

export const filter = (path) => {
    if (!isCallExpression(path.node))
        return false;
    
    if (!isIdentifier(path.node.callee, {name: 'where'}))
        return false;
    
    const selectPath = path.parentPath;
    
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
    const selectPath = path.parentPath;
    const selectArgs = selectPath.node.arguments;
    
    const alias = getPrimaryAlias(selectArgs);
    
    const fileNode = alias ? memberExpression(identifier(alias), identifier('file')) : identifier('file');
    
    const fileCondition = binaryExpression('===', fileNode, stringLiteral(':file'));
    const [condition] = path.node.arguments;
    
    path.node.arguments[0] = logicalExpression('&&', fileCondition, condition);
};
