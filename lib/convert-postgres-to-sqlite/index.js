import * as convertSerialToAutoIncrement from './rules/convert-serial-to-auto-increment/index.js';
import * as convertLastvalToLastInsertRowid from './rules/convert-lastval-to-last-insert-rowid/index.js';
import * as convertIdentityToAutoIncrement from './rules/convert-identity-to-auto-increment/index.js';
import * as convertNextvalToAutoIncrement from './rules/convert-nextval-to-auto-increment/index.js';
import * as convertCreateSequenceToSqlite from './rules/convert-create-sequence-to-sqlite/index.js';

export const rules = {
    'convert-serial-to-auto-increment': convertSerialToAutoIncrement,
    'convert-lastval-to-last-insert-rowid': convertLastvalToLastInsertRowid,
    'convert-identity-to-auto-increment': convertIdentityToAutoIncrement,
    'convert-nextval-to-auto-increment': convertNextvalToAutoIncrement,
    'convert-create-sequence-to-sqlite': convertCreateSequenceToSqlite,
};
