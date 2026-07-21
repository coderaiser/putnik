import test from 'supertape';
import {parse} from '@putout/babel';
import {
    createDb,
    createAllTables,
    createView,
    writeAst,
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

const constPlugin = {
    select: `SELECT id FROM VariableDeclaration WHERE file = :file AND kind = 'const'`,
    report: `SELECT 'Prefer let over const' AS message, start_line AS line, start_col AS col FROM VariableDeclaration WHERE file = :file AND kind = 'const'`,
    fix: `UPDATE VariableDeclaration SET kind = 'let' WHERE file = :file AND kind = 'const'`,
};

test('runner: runPlugin returns [] when no match', async (t) => {
    const db = setup();
    const plugin = {
        select: `SELECT id FROM VariableDeclaration WHERE file = :file AND kind = 'var'`,
        report: `SELECT 'test' AS message, 1 AS line, 0 AS col`,
    };
    
    t.equal((await runPlugin(db, plugin, 'index.js')).length, 0);
    t.end();
});

test('runner: runPlugin report mode returns places', async (t) => {
    t.equal((await runPlugin(setup(), constPlugin, 'index.js')).length, 1);
    t.end();
});

test('runner: runPlugin report mode returns message', async (t) => {
    t.equal((await runPlugin(setup(), constPlugin, 'index.js'))[0].message, 'Prefer let over const');
    t.end();
});

test('runner: runPlugin report mode does not mutate db', async (t) => {
    const db = setup();
    await runPlugin(db, constPlugin, 'index.js');
    const row = db.get('SELECT kind FROM VariableDeclaration WHERE file = :file', {
        file: 'index.js',
    });
    
    t.equal(row.kind, 'const');
    t.end();
});

test('runner: runPlugin fix mode mutates db', async (t) => {
    const db = setup();
    
    await runPlugin(db, constPlugin, 'index.js', {
        fix: true,
    });
    const row = db.get('SELECT kind FROM VariableDeclaration WHERE file = :file', {
        file: 'index.js',
    });
    
    t.equal(row.kind, 'let');
    t.end();
});

test('runner: runPlugin fix mode returns empty after fix', async (t) => {
    const db = setup();
    const result = await runPlugin(db, constPlugin, 'index.js', {
        fix: true,
    });
    
    t.equal(result.length, 0);
    t.end();
});
