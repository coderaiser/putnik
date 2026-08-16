export const report = () => 'Replace SERIAL with GENERATED ALWAYS AS IDENTITY';

export const replace = () => ({
    'column(__a, serial(), __b)': 'column(__a, INTEGER, __b, identity())',
});
