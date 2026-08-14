import * as withNamed from './rules/with-named.js';
import * as serial from './rules/serial.js';
import * as lastval from './rules/lastval.js';

export const rules = {
    'with-named': withNamed,
    serial,
    lastval,
};
