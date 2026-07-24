import {test} from 'supertape';
import {montag} from 'montag';
import {parse, transform, print} from '../putnik.js';

test('putnik: views: functions: finds async function', async (t) => {
    const plugin = {
        select: `SELECT id FROM functions WHERE async = 1 AND file = :file`,
        report: `SELECT 'async function' AS message, start_line AS line, start_col AS col
                 FROM functions WHERE id = :id`,
    };

    const db = await parse('t.js', montag`
        async function f() {}
    `);

    const places = await transform('t.js', db, {
        plugins: [['no-async', plugin]],
        fix: false,
    });

    t.equal(places.length, 1);
    t.end();
});

test('putnik: views: functions: no match returns empty', async (t) => {
    const plugin = {
        select: `SELECT id FROM functions WHERE async = 1 AND file = :file`,
        report: `SELECT 'async function' AS message, start_line AS line, start_col AS col
                 FROM functions WHERE id = :id`,
    };

    const db = await parse('t.js', montag`
        function f() {}
    `);

    const places = await transform('t.js', db, {
        plugins: [['no-async', plugin]],
        fix: false,
    });

    t.equal(places.length, 0);
    t.end();
});

test('putnik: views: functions: fix renames function', async (t) => {
    const plugin = {
        select: `SELECT id, name_id FROM functions WHERE file = :file`,
        fix:    `UPDATE Identifier SET name = 'g' WHERE id = :name_id`,
        report: `SELECT 'rename' AS message, start_line AS line, start_col AS col
                 FROM functions WHERE id = :id`,
    };

    const db = await parse('t.js', montag`
        function f() {}
    `);

    await transform('t.js', db, {
        plugins: [['rename', plugin]],
        fix: true,
    });

    const result = await print('t.js', db);
    t.equal(result, `function g() {}\n`);
    t.end();
});
