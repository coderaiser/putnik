import * as convertSequenceToSerial from './rules/convert-sequence-to-serial/index.js';
import * as convertSerialToIdentity from './rules/convert-serial-to-identity/index.js';

export const rules = {
    'convert-sequence-to-serial': convertSequenceToSerial,
    'convert-serial-to-identity': convertSerialToIdentity,
};
