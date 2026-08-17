import * as convertLastvalToLastInsertRowid from './convert-lastval-to-last-insert-rowid/index.js';
import * as convertNextvalToAutoIncrement from './convert-nextval-to-auto-increment/index.js';

export const rules = {
    'convert-lastval-to-last-insert-rowid': convertLastvalToLastInsertRowid,
    'convert-nextval-to-auto-increment': convertNextvalToAutoIncrement,
};
