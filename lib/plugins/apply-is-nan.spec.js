import supertape from 'supertape';
import {parse, transform} from '../putnik.js';
import {loadSqlPlugin} from '../sql-plugin/sql-plugin.js';

const plugin = loadSqlPlugin(new URL('apply-is-nan.sql', import.meta.url).pathname);

supertape('plugins: apply-is-nan: reports x === NaN', async (t) => {
    const db = await parse('t.js', 'if (x === NaN) {}\n');
    const places = await transform('t.js', db, {
        plugins: [
            ['apply-is-nan', plugin],
        ],
        fix: false,
    });
    
    t.equal(places.length, 1);
    t.end();
});

supertape('plugins: apply-is-nan: message', async (t) => {
    const db = await parse('t.js', 'if (x === NaN) {}\n');
    const [place] = await transform('t.js', db, {
        plugins: [
            ['apply-is-nan', plugin],
        ],
        fix: false,
    });
    
    t.equal(place.message, 'Prefer Number.isNaN over === NaN');
    t.end();
});

supertape('plugins: apply-is-nan: no report when already Number.isNaN', async (t) => {
    const db = await parse('t.js', 'if (Number.isNaN(x)) {}\n');
    const places = await transform('t.js', db, {
        plugins: [
            ['apply-is-nan', plugin],
        ],
        fix: false,
    });
    
    t.equal(places.length, 0);
    t.end();
});
