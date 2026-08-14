export const report = () => 'Replace lastval with lastInsertRowid for SQLite';

export const replace = () => ({
    'select(lastval())': 'select(lastInsertRowid())',
});
