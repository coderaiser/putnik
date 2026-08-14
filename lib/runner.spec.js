import test from 'supertape';
import {tryToCatch} from 'try-to-catch';
import {parse, runPlugin} from './putnik.js';

const constPlugin = {
    select: `SELECT id FROM VariableDeclaration WHERE file = :file AND kind = 'const'`,
    report: `SELECT 'Prefer let over const' AS message, start_line AS line, start_col AS col FROM VariableDeclaration WHERE file = :file AND kind = 'const'`,
    fix: `UPDATE VariableDeclaration SET kind = 'let' WHERE file = :file AND kind = 'const'`,
};

test('runner: runPlugin returns [] when no match', async (t) => {
    const db = await parse('index.js', 'const a = 1;\n');
    const plugin = {
        select: `SELECT id FROM VariableDeclaration WHERE file = :file AND kind = 'var'`,
        report: `SELECT 'test' AS message, 1 AS line, 0 AS col`,
    };
    
    t.equal((await runPlugin(db, plugin, 'index.js')).length, 0);
    t.end();
});

test('runner: runPlugin report mode returns places', async (t) => {
    const db = await parse('index.js', 'const a = 1;\n');
    
    t.equal((await runPlugin(db, constPlugin, 'index.js')).length, 1);
    t.end();
});

test('runner: runPlugin report mode returns message', async (t) => {
    const db = await parse('index.js', 'const a = 1;\n');
    
    t.equal((await runPlugin(db, constPlugin, 'index.js'))[0].message, 'Prefer let over const');
    t.end();
});

test('runner: runPlugin report mode does not mutate db', async (t) => {
    const db = await parse('index.js', 'const a = 1;\n');
    await runPlugin(db, constPlugin, 'index.js');
    const row = db.get('SELECT kind FROM VariableDeclaration WHERE file = :file', {
        file: 'index.js',
    });
    
    t.equal(row.kind, 'const');
    t.end();
});

test('runner: runPlugin fix mode mutates db', async (t) => {
    const db = await parse('index.js', 'const a = 1;\n');
    
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
    const db = await parse('index.js', 'const a = 1;\n');
    const result = await runPlugin(db, constPlugin, 'index.js', {
        fix: true,
    });
    
    t.equal(result.length, 0);
    t.end();
});
test('runner: runPlugin array fix runs all statements in order', async (t) => {
    const db = await parse('index.js', 'const a = 1;');
    const plugin = {
        select: `SELECT id FROM VariableDeclaration WHERE file = :file AND kind = 'const'`,
        report: `SELECT 'test' AS message, 1 AS line, 0 AS col`,
        fix: [
            `UPDATE VariableDeclaration SET kind = 'let' WHERE id = :id`,
            `UPDATE VariableDeclaration SET kind = 'var' WHERE id = :id`,
        ],
    };

    await runPlugin(db, plugin, 'index.js', {
        fix: true,
    });
    const rows = db.all('SELECT kind FROM VariableDeclaration WHERE file = :file', {
        file: 'index.js',
    });

    t.ok(rows.every((row) => row.kind === 'var'));
    t.end();
});

test('runner: runPlugin captures RETURNING id into next params', async (t) => {
    const calls = [];
    const db = {
        dialect: 'postgres',
        async all(query, params) {
            if (/FROM VariableDeclaration/.test(query))
                return [{
                    id: 1,
                    file: 'index.js',
                }];
            
            return [{
                message: 'test',
            }];
        },
        async insert(query, params) {
            calls.push({
                type: 'insert',
                query,
                params,
            });
            
            return 99;
        },
        async run(query, params) {
            calls.push({
                type: 'run',
                query,
                params,
            });
        },
        async transaction(fn) {
            await fn();
        },
    };
    const plugin = {
        select: `SELECT id FROM VariableDeclaration WHERE file = :file AND kind = 'const'`,
        report: `SELECT 'test' AS message, 1 AS line, 0 AS col`,
        fix: [
            `INSERT INTO Identifier (id) VALUES (:id) RETURNING id AS new_id`,
            `UPDATE Identifier SET name = 'x' WHERE id = :new_id`,
        ],
    };
    
    await runPlugin(db, plugin, 'index.js', {
        fix: true,
    });
    const last = calls.find((call) => call.type === 'run');
    
    t.equal(last.params.new_id, 99);
    t.end();
});

test('runner: runPlugin transaction rolls back on error', async (t) => {
    const db = await parse('index.js', 'const a = 1;');
    const plugin = {
        select: `SELECT id FROM VariableDeclaration WHERE file = :file AND kind = 'const'`,
        report: `SELECT 'test' AS message, 1 AS line, 0 AS col`,
        fix: [
            `UPDATE VariableDeclaration SET kind = 'let' WHERE id = :id`,
            `UPDATE NonExistingTable SET kind = 'var' WHERE id = :id`,
        ],
    };

    const [error] = await tryToCatch(runPlugin, db, plugin, 'index.js', {
        fix: true,
    });

    t.ok(error);
    t.end();
});

test('runner: runPlugin transaction does not commit on error', async (t) => {
    const db = await parse('index.js', 'const a = 1;');
    const plugin = {
        select: `SELECT id FROM VariableDeclaration WHERE file = :file AND kind = 'const'`,
        report: `SELECT 'test' AS message, 1 AS line, 0 AS col`,
        fix: [
            `UPDATE VariableDeclaration SET kind = 'let' WHERE id = :id`,
            `UPDATE NonExistingTable SET kind = 'var' WHERE id = :id`,
        ],
    };

    await tryToCatch(runPlugin, db, plugin, 'index.js', {
        fix: true,
    });
    const row = db.get('SELECT kind FROM VariableDeclaration WHERE file = :file', {
        file: 'index.js',
    });

    t.equal(row.kind, 'const');
    t.end();
});

test('runner: runPlugin converts postgres fix to sqlite dialect', async (t) => {
    const db = await parse('index.js', 'const a = 1;');
    const plugin = {
        select: `SELECT id FROM VariableDeclaration WHERE file = :file AND kind = 'const'`,
        report: `SELECT 'test' AS message, 1 AS line, 0 AS col`,
        fix: `SELECT lastval()`,
    };

    const [error] = await tryToCatch(runPlugin, db, plugin, 'index.js', {
        fix: true,
    });

    t.notOk(error);
    t.end();
});
