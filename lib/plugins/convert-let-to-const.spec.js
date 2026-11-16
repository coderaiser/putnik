import {createTest} from '#putnik/test';
import {loadPlugin} from '../sql-plugin/sql-plugin.js';

const plugin = loadPlugin(new URL('convert-let-to-const.sql', import.meta.url).pathname);

const test = createTest(import.meta.url, {
    plugins: [
        ['convert-let-to-const', plugin],
    ],
});

test('plugins: convert-let-to-const: process: let', async ({process}) => {
    await process('convert-let-to-const-let');
});

test('plugins: convert-let-to-const: no process: reassign', async ({noProcess}) => {
    await noProcess('convert-let-to-const-reassign-no-report');
});

test('plugins: convert-let-to-const: no process: no-init', async ({noProcess}) => {
    await noProcess('convert-let-to-const-no-init-no-report');
});

test('plugins: convert-let-to-const: no process: update', async ({noProcess}) => {
    await noProcess('convert-let-to-const-update-no-report');
});

test('plugins: convert-let-to-const: process: multiple', async ({process}) => {
    await process('convert-let-to-const-multiple');
});

test('plugins: convert-let-to-const: no process: multiple mixed', async ({noProcess}) => {
    await noProcess('convert-let-to-const-multiple-mixed-no-report');
});

test('plugins: convert-let-to-const: process: for-of', async ({process}) => {
    await process('convert-let-to-const-for-of');
});

test('plugins: convert-let-to-const: no process: for loop', async ({noProcess}) => {
    await noProcess('convert-let-to-const-for-loop-no-report');
});

test('plugins: convert-let-to-const: no process: closure', async ({noProcess}) => {
    await noProcess('convert-let-to-const-closure-no-report');
});

test('plugins: convert-let-to-const: process: destructuring', async ({process}) => {
    await process('convert-let-to-const-destructuring');
});

test('plugins: convert-let-to-const: no process: destructuring mixed', async ({noProcess}) => {
    await noProcess('convert-let-to-const-destructuring-mixed-no-report');
});

test('plugins: convert-let-to-const: process: export', async ({process}) => {
    await process('convert-let-to-const-export');
});

test('plugins: convert-let-to-const: comparePlaces: convert-let-to-const-let', async ({comparePlaces}) => {
    await comparePlaces('convert-let-to-const-let', [{
        file: 'fixture.js',
        message: `Use 'const' when no reassign`,
        position: {
            line: 1,
            column: 0,
        },
        rule: 'convert-let-to-const',
    }]);
});
