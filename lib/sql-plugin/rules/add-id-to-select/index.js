import {types} from 'putout';
import {isIdentifier} from '@babel/types';

const {identifier} = types;

export const report = () => `Add 'id' as first column to @select`;

export const match = () => ({
    [`section('@select', select(__args))`]: ({__args}) => {
        const [first] = __args;
        
        return !isIdentifier(first, {
            name: 'id',
        });
    },
});

export const replace = () => ({
    [`section('@select', select(__args))`]: ({__args}, path) => {
        __args.unshift(identifier('id'));
        return path;
    },
});
