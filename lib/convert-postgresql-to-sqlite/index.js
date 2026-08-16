import * as convertWithNamedToSequential from './rules/convert-with-to-sequential/index.js';
import * as convertSerialToAutoIncrement from './rules/convert-serial-to-auto-increment.js';
import * as convertLastvalToLastInsertRowid from './rules/convert-lastval-to-last-insert-rowid.js';
import * as convertIdentityToAutoIncrement from './rules/convert-identity-to-auto-increment.js';
import * as convertNextvalToAutoIncrement from './rules/convert-nextval-to-auto-increment.js';
import * as convertCreateSequenceToSqlite from './rules/convert-create-sequence-to-sqlite.js';

export const rules = {
    'convert-with-named-to-sequential': convertWithNamedToSequential,
    'convert-serial-to-auto-increment': convertSerialToAutoIncrement,
    'convert-lastval-to-last-insert-rowid': convertLastvalToLastInsertRowid,
    'convert-identity-to-auto-increment': convertIdentityToAutoIncrement,
    'convert-nextval-to-auto-increment': convertNextvalToAutoIncrement,
    'convert-create-sequence-to-sqlite': convertCreateSequenceToSqlite,
};
