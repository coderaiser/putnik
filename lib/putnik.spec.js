import test from 'supertape';
import {parse} from '@babel/parser';
import {
    createDb,
    createAllTables,
    createView,
    writeAst,
    readAst,
    runPlugin,
} from './putnik.js';

function setup() {
    const db = createDb();
    createAllTables(db);
    createView(db);
    writeAst(db, parse('const a = 1;', {
        sourceType: 'module',
    }), 'index.js');
    
    return db;
}

test('round-trip: const a = 1', (t) => {
    const db = setup();
    
    const result = readAst(db, 'index.js');
    
    t.equal(result.program.body[0].kind, 'const');
    t.equal(result.program.body[0].declarations[0].id.name, 'a');
    t.equal(result.program.body[0].declarations[0].init.value, 1);
    t.end();
});

test('plugin reports places without mutating db', (t) => {
    const db = setup();
    
    const plugin = {
        message: 'Prefer let over const',
        include: () => [
            'VariableDeclaration',
        ],
        fix(node) {
            node.kind = 'let';
        },
    };
    
    const places = runPlugin(db, plugin, 'index.js');
    
    t.equal(places.length, 1);
    t.equal(places[0].message, 'Prefer let over const');
    t.equal(places[0].position.line, 1);
    
    const row = db.get(`SELECT kind FROM VariableDeclaration WHERE file = ?`, ['index.js']);
    t.equal(row.kind, 'const');
    t.end();
});

test('plugin mutates db in fix mode', (t) => {
    const db = setup();
    
    const plugin = {
        message: 'Prefer let over const',
        include: () => [
            'VariableDeclaration',
        ],
        fix(node) {
            node.kind = 'let';
        },
    };
    
    runPlugin(db, plugin, 'index.js', {
        fix: true,
    });
    
    const row = db.get(`SELECT kind FROM VariableDeclaration WHERE file = ?`, ['index.js']);
    
    t.equal(row.kind, 'let');
    t.end();
});
