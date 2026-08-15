export const report = () => 'Replace IDENTITY with INTEGER + autoIncrement for SQLite';

export const replace = () => ({
    'column(__a, __c, identity(), __b)': 'column(__a, INTEGER, __b, autoIncrement())',
    'column(__a, __c, identityByDefault(), __b)': 'column(__a, INTEGER, __b, autoIncrement())',
});
