import {test} from 'supertape';
import {
    createHasColumn,
    hasIdColumn,
    hasStartLineColumn,
} from './columns.js';

const arg = (name) => ({
    name,
});

test('sql-plugin: columns: createHasColumn finds name', (t) => {
    const hasFile = createHasColumn('file');
    const result = hasFile([
        arg('id'),
        arg('file'),
    ]);
    
    t.ok(result);
    t.end();
});

test('sql-plugin: columns: hasIdColumn finds id', (t) => {
    const result = hasIdColumn([
        arg('id'),
        arg('file'),
    ]);
    
    t.ok(result);
    t.end();
});

test('sql-plugin: columns: hasStartLineColumn finds start_line', (t) => {
    const result = hasStartLineColumn([
        arg('start_line'),
        arg('file'),
    ]);
    
    t.ok(result);
    t.end();
});

test('sql-plugin: columns: hasIdColumn false when missing', (t) => {
    const result = hasIdColumn([
        arg('file'),
        arg('name'),
    ]);
    
    t.notOk(result);
    t.end();
});

test('sql-plugin: columns: hasStartLineColumn false when missing', (t) => {
    const result = hasStartLineColumn([
        arg('file'),
        arg('name'),
    ]);
    
    t.notOk(result);
    t.end();
});
