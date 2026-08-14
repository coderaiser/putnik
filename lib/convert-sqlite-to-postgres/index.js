import * as lastInsertRowid from './rules/last-insert-rowid.js';
import * as autoIncrement from './rules/auto-increment.js';

export const rules = {
    'last-insert-rowid': lastInsertRowid,
    'auto-increment': autoIncrement,
};

