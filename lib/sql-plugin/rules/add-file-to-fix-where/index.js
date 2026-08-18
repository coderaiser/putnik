import {operator, types} from 'putout';

const {compareAny} = operator;
const {
    isCallExpression,
    isIdentifier,
    identifier,
    stringLiteral,
    binaryExpression,
    logicalExpression,
} = types;

const isStringLiteral = (a) => a && a.type === 'StringLiteral';

const FIX_STATEMENT_CALLEES = new Set([
    'update',
    'deleteFrom',
]);

const hasFileBinding = (__a) => compareAny(__a, [
    'file === ":file"',
    'file === ":file" && __',
    '__ && file === ":file"',
]);

export const report = () => 'Add "file = :file" to @fix WHERE';

export const include = () => [
    'CallExpression',
];

export const filter = (path) => {
    if (!isIdentifier(path.node.callee, {name: 'where'}))
        return false;
    
    const stmtPath = path.parentPath;
    
    if (!isCallExpression(stmtPath.node))
        return false;
    
    if (!FIX_STATEMENT_CALLEES.has(stmtPath.node.callee.name))
        return false;
    
    const sectionPath = stmtPath.parentPath;
    
    // @fix array: section('@fix', [...]) — stmtPath is inside an ArrayExpression
    const maybeSectionPath = sectionPath.parentPath;
    
    const resolvedSectionNode = isCallExpression(sectionPath.node) && isIdentifier(sectionPath.node.callee, {
        name: 'section',
    }) ? sectionPath.node : isCallExpression(maybeSectionPath?.node) && isIdentifier(maybeSectionPath.node.callee, {
            name: 'section',
        }) ? maybeSectionPath.node : null;
    
    if (!resolvedSectionNode)
        return false;
    
    const [tag] = resolvedSectionNode.arguments;
    
    if (!isStringLiteral(tag) || tag.value !== '@fix')
        return false;
    
    const [whereArg] = path.node.arguments;
    
    if (!whereArg)
        return false;
    
    return !hasFileBinding(whereArg);
};

export const fix = (path) => {
    const fileCondition = binaryExpression('===', identifier('file'), stringLiteral(':file'));
    const [condition] = path.node.arguments;
    
    path.node.arguments[0] = logicalExpression('&&', fileCondition, condition);
};
