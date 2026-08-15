export const report = () => 'Replace nextval with autoIncrement for SQLite';

export const replace = () => ({
    'column(__a, __type, nextval(__seq), __b)': 'column(__a, INTEGER, __b, autoIncrement())',
});
