export const report = () => 'Replace serial with INTEGER + autoIncrement for SQLite';

export const replace = () => ({
    'column(__a, serial(), __b)': 'column(__a, INTEGER, __b, autoIncrement())',
});
