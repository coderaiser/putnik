import {types} from 'putout';

const {isArray} = Array;
const maybeArray = (a) => isArray(a) ? a : [a];

const {
    isIdentifier,
    isMemberExpression,
} = types;

export const createHasColumn = (name) => (args) => {
    for (const arg of maybeArray(args)) {
        if (isIdentifier(arg, {name}))
            return true;
        
        if (isMemberExpression(arg) && isIdentifier(arg.property, {name}))
            return true;
    }
    
    return false;
};

export const hasId = createHasColumn('id');
export const hasStartLine = createHasColumn('start_line');
