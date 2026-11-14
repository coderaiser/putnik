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
    isTSAsExpression,
    callExpression,
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

const isFrom = (node) => isCallExpression(node) && isIdentifier(node.callee, {
    name: 'from',
});

const isWhere = (node) => isCallExpression(node) && isIdentifier(node.callee, {
    name: 'where',
});

const isJoin = (node) => isCallExpression(node) && isIdentifier(node.callee, {
    name: 'join',
});

const isCallTo = (name) => (node) => isCallExpression(node) && isIdentifier(node.callee, {
    name,
});

const isSelect = isCallTo('select');
const isSection = isCallTo('section');

// from() of the top level select of @select section
const isSelectSectionFrom = (fromPath) => {
    if (!isFrom(fromPath.node))
        return false;
    
    const selectPath = fromPath.parentPath;
    
    if (!isSelect(selectPath.node))
        return false;
    
    const sectionPath = selectPath.parentPath;
    
    if (!isSection(sectionPath.node))
        return false;
    
    const [tag] = sectionPath.node.arguments;
    
    return isStringLiteral(tag) && tag.value === '@select';
};

const filterWhere = (path) => {
    if (!isSelectSectionFrom(path.parentPath))
        return false;
    
    const [whereArg] = path.node.arguments;
    
    if (!whereArg)
        return false;
    
    return !hasFileBinding(whereArg);
};

// query without WHERE, JOINs have to be scoped as well
const filterFrom = (path) => {
    if (!isSelectSectionFrom(path))
        return false;
    
    return !path.node.arguments.some(isWhere);
};

export const filter = (path) => {
    if (isWhere(path.node))
        return filterWhere(path);
    
    return filterFrom(path);
};

const getFromQualifier = ({arguments: args}) => {
    const [first] = args;
    
    if (isTSAsExpression(first))
        return extract(first.typeAnnotation);
    
    if (isIdentifier(first) && args.some(isJoin))
        return first.name;
    
    return null;
};

const addWhere = (path) => {
    const qualifier = getFromQualifier(path.node);
    const fileNode = qualifier ? memberExpression(identifier(qualifier), identifier('file')) : identifier('file');
    
    path.node.arguments.push(callExpression(identifier('where'), [
        binaryExpression('===', fileNode, stringLiteral(':file')),
    ]));
};

export const fix = (path) => {
    if (isFrom(path.node))
        return addWhere(path);
    
    const {__b} = getTemplateValues(path.parentPath, 'from(__a as __b)');
    
    const alias = __b ? extract(__b) : null;
    
    const fileNode = alias ? memberExpression(identifier(alias), identifier('file')) : identifier('file');
    
    const fileCondition = binaryExpression('===', fileNode, stringLiteral(':file'));
    const [condition] = path.node.arguments;
    
    path.node.arguments[0] = logicalExpression('&&', fileCondition, condition);
};
