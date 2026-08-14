export const report = () => 'Replace INTEGER + autoIncrement with serial for PostgreSQL';

export const replace = () => ({
    'column(__a, INTEGER, __b, autoIncrement())': 'column(__a, serial(), __b)',
});
