import * as convertLastvalToLastInsertRowid from './convert-lastval-to-last-insert-rowid/index.js';
import * as convertNextvalToAutoIncrement from './convert-nextval-to-auto-increment/index.js';
import * as convertCreateSequenceToSqlite from './convert-create-sequence-to-sqlite/index.js';

export const rules = {
    'convert-lastval-to-last-insert-rowid': convertLastvalToLastInsertRowid,
    'convert-nextval-to-auto-increment': convertNextvalToAutoIncrement,
    'convert-create-sequence-to-sqlite': convertCreateSequenceToSqlite,
};
