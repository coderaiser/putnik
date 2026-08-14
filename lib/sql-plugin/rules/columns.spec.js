import {test} from 'supertape';
import {createHasColumn, hasIdColumn, hasStartLineColumn} from './columns.js';

const arg = (name) => ({
    name,
});

test('sql-plugin: columns: createHasColumn finds name', (t) => {
    const hasFile = createHasColumn('file');

    t.equal(hasFile([arg('id'), arg('file')]), true);
    t.end();
});

test('sql-plugin: columns: hasIdColumn finds id', (t) => {
    t.equal(hasIdColumn([arg('id'), arg('file')]), true);
    t.end();
});

test('sql-plugin: columns: hasStartLineColumn finds start_line', (t) => {
    t.equal(hasStartLineColumn([arg('start_line'), arg('file')]), true);
    t.end();
});

test('sql-plugin: columns: hasIdColumn false when missing', (t) => {
    t.equal(hasIdColumn([arg('file'), arg('name')]), false);
    t.end();
});

test('sql-plugin: columns: hasStartLineColumn false when missing', (t) => {
    t.equal(hasStartLineColumn([arg('file'), arg('name')]), false);
    t.end();
});
