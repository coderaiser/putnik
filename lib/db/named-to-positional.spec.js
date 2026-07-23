import {test} from 'supertape';
import {namedToPositional} from './named-to-positional.js';

test('namedToPositional: replaces single named param sql', (t) => {
    const {sql} = namedToPositional('SELECT id FROM t WHERE file = :file', {
        file: 'test.js',
    });
    
    t.equal(sql, 'SELECT id FROM t WHERE file = $1');
    t.end();
});

test('namedToPositional: replaces single named param values', (t) => {
    const {values} = namedToPositional('SELECT id FROM t WHERE file = :file', {
        file: 'test.js',
    });
    
    const result = values;
    const expected = ['test.js'];
    
    t.deepEqual(result, expected);
    t.end();
});

test('namedToPositional: replaces multiple named params sql', (t) => {
    const {sql} = namedToPositional('SELECT id FROM t WHERE file = :file AND kind = :kind', {
        file: 'test.js',
        kind: 'const',
    });
    
    t.equal(sql, 'SELECT id FROM t WHERE file = $1 AND kind = $2');
    t.end();
});

test('namedToPositional: replaces multiple named params values', (t) => {
    const {values} = namedToPositional('SELECT id FROM t WHERE file = :file AND kind = :kind', {
        file: 'test.js',
        kind: 'const',
    });
    
    const result = values;
    
    const expected = [
        'test.js',
        'const',
    ];
    
    t.deepEqual(result, expected);
    t.end();
});

test('namedToPositional: repeated param name sql', (t) => {
    const {sql} = namedToPositional('SELECT id FROM t WHERE x = :x AND y = :x', {
        x: 1,
    });
    
    t.equal(sql, 'SELECT id FROM t WHERE x = $1 AND y = $2');
    t.end();
});

test('namedToPositional: repeated param name values', (t) => {
    const {values} = namedToPositional('SELECT id FROM t WHERE x = :x AND y = :x', {
        x: 1,
    });
    
    const result = values;
    const expected = [1, 1];
    
    t.deepEqual(result, expected);
    t.end();
});

test('namedToPositional: missing param defaults to null sql', (t) => {
    const {sql} = namedToPositional('SELECT id FROM t WHERE file = :file', {});
    
    t.equal(sql, 'SELECT id FROM t WHERE file = $1');
    t.end();
});

test('namedToPositional: missing param defaults to null values', (t) => {
    const {values} = namedToPositional('SELECT id FROM t WHERE file = :file', {});
    const result = values;
    const expected = [null];
    
    t.deepEqual(result, expected);
    t.end();
});

test('namedToPositional: no params passthrough', (t) => {
    const {sql} = namedToPositional('SELECT 1');
    
    t.equal(sql, 'SELECT 1');
    t.end();
});

test('namedToPositional: no params passthrough values', (t) => {
    const {values} = namedToPositional('SELECT 1');
    const result = values;
    const expected = [];
    
    t.deepEqual(result, expected);
    t.end();
});

test('namedToPositional: no named params but object passed', (t) => {
    const {sql} = namedToPositional('SELECT 1', {
        x: 1,
    });
    
    t.equal(sql, 'SELECT 1');
    t.end();
});

test('namedToPositional: zero value preserved', (t) => {
    const {values} = namedToPositional('SELECT id FROM t WHERE x = :x', {
        x: 0,
    });
    
    const result = values;
    const expected = [0];
    
    t.deepEqual(result, expected);
    t.end();
});

test('namedToPositional: false value preserved', (t) => {
    const {values} = namedToPositional('SELECT id FROM t WHERE x = :x', {
        x: false,
    });
    
    const result = values;
    const expected = [false];
    
    t.deepEqual(result, expected);
    t.end();
});

test('namedToPositional: empty string value preserved', (t) => {
    const {values} = namedToPositional('SELECT id FROM t WHERE x = :x', {
        x: '',
    });
    
    const result = values;
    const expected = [''];
    
    t.deepEqual(result, expected);
    t.end();
});
