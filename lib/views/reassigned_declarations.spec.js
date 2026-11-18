import {test} from 'supertape';
import {montag} from 'montag';
import {parse, transform} from '../putnik.js';

const plugin = {
    select: `SELECT id FROM reassigned_declarations WHERE file = :file`,
    report: `SELECT 'reassigned' AS message, start_line AS line, start_col AS col
             FROM VariableDeclaration WHERE id = :id`,
};

const getLine = ({position}) => position.line;

const run = async (file, db) => await transform(file, db, {
    plugins: [
        ['reassigned', plugin],
    ],
    fix: false,
});

test('putnik: views: reassigned_declarations: finds a reassigned declaration', async (t) => {
    const db = await parse('t.js', montag`
        let a = 1;
        a = 2;
    `, {
        bindings: true,
    });
    
    const places = await run('t.js', db);
    
    t.equal(places.length, 1);
    t.end();
});

test('putnik: views: reassigned_declarations: skips a declaration without write', async (t) => {
    const db = await parse('t.js', montag`
        let a = 1;
    `, {
        bindings: true,
    });
    
    const places = await run('t.js', db);
    
    t.equal(places.length, 0);
    t.end();
});

test('putnik: views: reassigned_declarations: finds the declaration of the write only', async (t) => {
    const db = await parse('t.js', montag`
        let a = 1;
        let b = 2;
        a = 3;
    `, {
        bindings: true,
    });
    
    const places = await run('t.js', db);
    const result = places.map(getLine);
    const expected = [1];
    
    t.deepEqual(result, expected);
    t.end();
});

test('putnik: views: reassigned_declarations: keeps the file', async (t) => {
    const db = await parse(['a.js', 'b.js'], [montag`
            let a = 1;
            a = 2;
        `, montag`
            let b = 1;
        `], {
        bindings: true,
    });
    
    const first = await run('a.js', db);
    const second = await run('b.js', db);
    const result = [first.length, second.length];
    const expected = [1, 0];
    
    t.deepEqual(result, expected);
    t.end();
});
