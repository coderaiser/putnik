import * as convertSerialToAutoIncrement from './convert-serial-to-auto-increment/index.js';
import * as convertLastvalToLastInsertRowid from './convert-lastval-to-last-insert-rowid/index.js';
import * as convertIdentityToAutoIncrement from './convert-identity-to-auto-increment/index.js';
import * as convertNextvalToAutoIncrement from './convert-nextval-to-auto-increment/index.js';
import * as convertCreateSequenceToSqlite from './convert-create-sequence-to-sqlite/index.js';

export const rules = {
    'convert-serial-to-auto-increment': convertSerialToAutoIncrement,
    'convert-lastval-to-last-insert-rowid': convertLastvalToLastInsertRowid,
    'convert-identity-to-auto-increment': convertIdentityToAutoIncrement,
    'convert-nextval-to-auto-increment': convertNextvalToAutoIncrement,
    'convert-create-sequence-to-sqlite': convertCreateSequenceToSqlite,
};
