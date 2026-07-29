import {operator} from 'putout';

const {compareAny} = operator;

export const report = () => 'Add "file = :file" to WHERE';
export const match = () => ({
    'where(__a)': ({__a}) => !compareAny(__a, [
        'file === ":file"',
        'file === ":file" && __',
        '__ && file === ":file"',
    ]),
});

export const replace = () => ({
    'where(__a)': 'where(file === ":file" && __a)',
});
