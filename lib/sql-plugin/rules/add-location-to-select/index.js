import {types, operator} from 'putout';
import {hasStartLine} from '../columns.js';

const {
    getTemplateValues,
    compare,
} = operator;

const {
    identifier,
    isCallExpression,
    isIdentifier,
    isStringLiteral,
    memberExpression,
} = types;

export const report = () => `Add 'start_line', 'start_col' to @select`;

export const include = () => [
    'CallExpression',
];

export const filter = (path) => {
    if (!isIdentifier(path.node.callee, {name: 'select'}))
        return false;
    
    const parent = path.parentPath;
    
    if (!isCallExpression(parent.node))
        return false;
    
    if (!isIdentifier(parent.node.callee, {name: 'section'}))
        return false;
    
    const [tag] = parent.node.arguments;
    
    if (!isStringLiteral(tag) || tag.value !== '@select')
        return false;
    
    return !hasStartLine(path.node.arguments);
};

export const fix = (path) => {
    const startLine = identifier('start_line');
    const startCol = identifier('start_col');
    
    const args = path.node.arguments;
    
    const {length} = args;
    const index = args.findIndex(isFrom);
    
    if (index === -1) {
        args.splice(length, 0, startLine, startCol);
        return;
    }
    
    const {__a} = getTemplateValues(args[index], 'from(__a)');
    
    if (compare(__a, 'as(__b, __c)')) {
        const {__c} = getTemplateValues(__a, 'as(__b, __c)');
        const startLineMember = memberExpression(__c, startLine);
        const startColMember = memberExpression(__c, startCol);
        
        args.splice(index, 0, startLineMember, startColMember);
        
        return;
    }
    
    args.splice(index, 0, startLine, startCol);
};

const isFrom = (arg) => {
    if (!isCallExpression(arg))
        return false;
    
    return isIdentifier(arg.callee, {
        name: 'from',
    });
};
