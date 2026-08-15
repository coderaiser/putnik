export const report = () => 'Replace nextval with autoIncrement for SQLite';

export const replace = () => ({
    'column(__a, __b, nextval(__c), __d)': 'column(__a, INTEGER, __d, autoIncrement())',
});
