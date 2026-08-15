import {createTest} from '@putout/test';
import * as withNamed from './rules/with-named.js';
import * as serial from './rules/serial.js';
import * as lastval from './rules/lastval.js';
import * as identity from './rules/identity.js';
import * as nextval from './rules/nextval.js';
import * as createSequence from './rules/create-sequence.js';

const testWithNamed = createTest(import.meta.url, {
    plugins: [
        ['with-named', withNamed],
    ],
});

testWithNamed('convert-postgres-to-sqlite: withNamed report', (t) => {
    t.report('with-named', `Replace withNamed with portable sequential inserts`);
    t.end();
});

testWithNamed('convert-postgres-to-sqlite: withNamed transform', (t) => {
    t.transform('with-named');
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

const testNextval = createTest(import.meta.url, {
    plugins: [
        ['nextval', nextval],
    ],
});

testNextval('convert-postgres-to-sqlite: nextval report', (t) => {
    t.report('nextval', `Replace nextval with autoIncrement for SQLite`);
    t.end();
});

testNextval('convert-postgres-to-sqlite: nextval transform', (t) => {
    t.transform('nextval');
    t.end();
});

const testCreateSequence = createTest(import.meta.url, {
    plugins: [
        ['create-sequence', createSequence],
    ],
});

testCreateSequence('convert-postgres-to-sqlite: create-sequence report', (t) => {
    t.report('create-sequence', `Remove CREATE SEQUENCE for SQLite`);
    t.end();
});

testCreateSequence('convert-postgres-to-sqlite: create-sequence transform', (t) => {
    t.transform('create-sequence');
    t.end();
});
