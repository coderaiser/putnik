import {types} from 'putout';

const {
    isIdentifier,
    isMemberExpression,
} = types;

export const createHasColumn = (name) => (args) => {
    for (const arg of args) {
        if (isIdentifier(arg, {name}))
            return true;
        
        if (isMemberExpression(arg) && isIdentifier(arg.property, {name}))
            return true;
    }
    
    return false;
};

export const hasId = createHasColumn('id');
export const hasStartLine = createHasColumn('start_line');
