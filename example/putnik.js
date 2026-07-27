import putnik from '../lib/putnik.js';

const [code] = await putnik(import.meta.url, 'const a = 3; const b = 4', {
    database: 'hello.sql',
    plugins: [
        ['update', {
            report: `select 'hello'`,
            fix: `update Identifier set name = 'world' where id = :id`,
            select: `select id from Identifier where name = 'b'`,
        }],
    ],
});

const [, places] = await putnik(import.meta.url, 'const a = 3; const b = 4', {
    fix: false,
    database: 'hello.sql',
    plugins: [
        ['update', {
            report: `select 'hello'`,
            fix: `update Identifier set name = 'world' where id = :id`,
            select: `select id from Identifier where name = 'b'`,
        }],
    ],
});

console.log(code, places);
