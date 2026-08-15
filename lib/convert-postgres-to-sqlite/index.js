import * as withNamed from './rules/with-named.js';
import * as serial from './rules/serial.js';
import * as lastval from './rules/lastval.js';
import * as identity from './rules/identity.js';
import * as nextval from './rules/nextval.js';
import * as createSequence from './rules/create-sequence.js';

export const rules = {
    'with-named': withNamed,
    serial,
    lastval,
    identity,
    nextval,
    'create-sequence': createSequence,
};
