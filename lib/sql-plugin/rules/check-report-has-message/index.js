import {types} from 'putout';

const {isIdentifier} = types;

const hasMessage = (__args) => __args.some((a) => isIdentifier(a, {
    name: 'message',
}));

export const report = () => `@report SELECT must include a 'message' column`;

export const match = () => ({
    [`section('@report', select(__args))`]: ({__args}) => !hasMessage(__args),
});

export const replace = () => ({
    [`section('@report', select(__args))`]: (vars, path) => path,
});
