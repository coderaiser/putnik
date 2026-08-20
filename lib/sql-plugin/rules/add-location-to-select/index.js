import {types, operator} from 'putout';
import {hasStartLine} from '../columns.js';

const {getTemplateValues} = operator;

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
    const lastArg = args.at(-1);
    const hasFrom = isCallExpression(lastArg) &&
        isIdentifier(lastArg.callee, {name: 'from'});
    
    if (!hasFrom) {
        args.splice(args.length, 0, startLine, startCol);
        return;
    }
    
    const {__b} = getTemplateValues(lastArg, 'from(__a as __b)');
    
    if (__b) {
        const alias = identifier(__b.literal.value);
        
        args.splice(args.length - 1, 0,
            memberExpression(alias, startLine),
            memberExpression(alias, startCol),
        );
        
        return;
    }
    
    args.splice(args.length - 1, 0, startLine, startCol);
};
