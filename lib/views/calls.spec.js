import {test} from 'supertape';
import {montag} from 'montag';
import {parse, transform, print} from '../putnik.js';

test('putnik: views: calls: finds console.log', async (t) => {
    const plugin = {
        select: `SELECT property_id FROM calls WHERE object_name = 'console' AND file = :file`,
        report: `SELECT 'no console.log' AS message, start_line AS line, start_col AS col
                 FROM Identifier WHERE id = :property_id`,
    };

    const db = await parse('t.js', montag`
        console.log('hello');
    `);

    const places = await transform('t.js', db, {
        plugins: [['no-console', plugin]],
        fix: false,
    });

    t.equal(places.length, 1);
    t.end();
});

test('putnik: views: calls: fix renames property', async (t) => {
    const plugin = {
        select: `SELECT property_id FROM calls WHERE object_name = 'console' AND file = :file`,
        fix:    `UPDATE Identifier SET name = 'warn' WHERE id = :property_id`,
        report: `SELECT 'no console.log' AS message, start_line AS line, start_col AS col
                 FROM Identifier WHERE id = :property_id`,
    };

    const db = await parse('t.js', montag`
        console.log('hello');
    `);

    await transform('t.js', db, {
        plugins: [['no-console', plugin]],
        fix: true,
    });

    const result = await print('t.js', db);
    t.equal(result, `console.warn('hello');\n`);
    t.end();
});

test('putnik: views: calls: no match returns empty places', async (t) => {
    const plugin = {
        select: `SELECT property_id FROM calls WHERE object_name = 'console' AND file = :file`,
        report: `SELECT 'no console.log' AS message, start_line AS line, start_col AS col
                 FROM Identifier WHERE id = :property_id`,
    };

    const db = await parse('t.js', montag`
        fetch('https://example.com');
    `);

    const places = await transform('t.js', db, {
        plugins: [['no-console', plugin]],
        fix: false,
    });

    t.equal(places.length, 0);
    t.end();
});
