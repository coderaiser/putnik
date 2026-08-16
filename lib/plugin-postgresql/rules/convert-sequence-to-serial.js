import {operator, types} from 'putout';

const {remove} = operator;
const {isIdentifier, callExpression, identifier} = types;

export const report = () => 'Replace CREATE SEQUENCE + nextval with SERIAL';

export const include = () => [
    'createSequence(__a)',
];

export const filter = (path) => {
    const seqName = path.node.arguments[0].name;
    const elements = path.parentPath.node.elements;
    
    return elements.filter((el) => hasNextval(el, seqName)).length === 1;
};

export const fix = (path) => {
    const seqName = path.node.arguments[0].name;
    const elements = path.parentPath.node.elements;
    
    for (const el of elements)
        replaceNextvalWithSerial(el, seqName);
    
    remove(path);
};

const hasNextval = (node, seqName) => {
    if (!node)
        return false;
    
    const children = [
        ...node.arguments ?? [],
        ...node.elements ?? [],
    ];
    
    for (const child of children) {
        if (isNextvalCall(child, seqName))
            return true;
        
        if (hasNextval(child, seqName))
            return true;
    }
    
    return false;
};

const isNextvalCall = (node, seqName) =>
    node?.callee?.name === 'nextval' &&
    isIdentifier(node.arguments?.[0], {name: seqName});

const replaceNextvalWithSerial = (node, seqName) => {
    if (!node)
        return;
    
    const args = node.arguments;
    
    if (args) {
        for (let i = 0; i < args.length; i++) {
            if (isNextvalCall(args[i], seqName)) {
                args.splice(i - 1, 2, callExpression(identifier('serial'), []));
                return;
            }
        }
    }
    
    const children = [
        ...node.arguments ?? [],
        ...node.elements ?? [],
    ];
    
    for (const child of children)
        replaceNextvalWithSerial(child, seqName);
};