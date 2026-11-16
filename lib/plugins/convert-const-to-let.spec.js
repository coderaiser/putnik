import {createTest} from '#putnik/test';
import {loadPlugin} from '../sql-plugin/sql-plugin.js';

const plugin = loadPlugin(new URL('convert-const-to-let.sql', import.meta.url).pathname);

const test = createTest(import.meta.url, {
    plugins: [
        ['convert-const-to-let', plugin],
    ],
});

test('plugins: convert-const-to-let: process: const', async ({process}) => {
    await process('convert-const-to-let-const');
});

test('plugins: convert-const-to-let: no process: export', async ({noProcess}) => {
    await noProcess('convert-const-to-let-export-no-report');
});

test('plugins: convert-const-to-let: no process: first-const', async ({noProcess}) => {
    await noProcess('convert-const-to-let-first-const-no-report');
});

test('plugins: convert-const-to-let: process: multiple', async ({process}) => {
    await process('convert-const-to-let-multiple');
});

test('plugins: convert-const-to-let: process: no-init', async ({process}) => {
    await process('convert-const-to-let-no-init');
});

test('plugins: convert-const-to-let: no process: no-reassign', async ({noProcess}) => {
    await noProcess('convert-const-to-let-no-reassign-no-report');
});

test('plugins: convert-const-to-let: convert-const-to-let-const', async ({comparePlaces}) => {
    await comparePlaces('convert-const-to-let-const', [{
        file: 'fixture.js',
        message: `Use 'let' when reassign`,
        position: {
            line: 2,
            column: 0,
        },
        rule: 'convert-const-to-let',
    }, {
        file: 'fixture.js',
        message: `Use 'let' when reassign`,
        position: {
            line: 5,
            column: 0,
        },
        rule: 'convert-const-to-let',
    }, {
        file: 'fixture.js',
        message: `Use 'let' when reassign`,
        position: {
            line: 9,
            column: 5,
        },
        rule: 'convert-const-to-let',
    }]);
});
