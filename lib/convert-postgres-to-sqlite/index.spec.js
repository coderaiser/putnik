import {createTest} from '@putout/test';
import * as withNamed from './rules/with-named.js';
import * as serial from './rules/serial.js';
import * as lastval from './rules/lastval.js';
import * as identity from './rules/identity.js';

const testWithNamed = createTest(import.meta.url, {
    plugins: [
        ['with-named', withNamed],
    ],
});

testWithNamed('convert-postgres-to-sqlite: withNamed report', (t) => {
    t.report('withNamed', `Replace withNamed with portable sequential inserts`);
    t.end();
});

testWithNamed('convert-postgres-to-sqlite: withNamed transform', (t) => {
    t.transform('withNamed');
    t.end();
});

const testSerial = createTest(import.meta.url, {
    plugins: [
        ['serial', serial],
    ],
});

testSerial('convert-postgres-to-sqlite: serial report', (t) => {
    t.report('serial', `Replace serial with INTEGER + autoIncrement for SQLite`);
    t.end();
});

testSerial('convert-postgres-to-sqlite: serial transform', (t) => {
    t.transform('serial');
    t.end();
});

const testLastval = createTest(import.meta.url, {
    plugins: [
        ['lastval', lastval],
    ],
});

testLastval('convert-postgres-to-sqlite: lastval report', (t) => {
    t.report('lastval', `Replace lastval with lastInsertRowid for SQLite`);
    t.end();
});

testLastval('convert-postgres-to-sqlite: lastval transform', (t) => {
    t.transform('lastval');
    t.end();
});

const testIdentity = createTest(import.meta.url, {
    plugins: [
        ['identity', identity],
    ],
});

testIdentity('convert-postgres-to-sqlite: identity report', (t) => {
    t.report('identity-always', `Replace IDENTITY with INTEGER + autoIncrement for SQLite`);
    t.end();
});

testIdentity('convert-postgres-to-sqlite: identity transform ALWAYS', (t) => {
    t.transform('identity-always');
    t.end();
});

testIdentity('convert-postgres-to-sqlite: identity transform BY DEFAULT', (t) => {
    t.transform('identity-by-default');
    t.end();
});
