import {createTest} from '#putnik/test';
import {loadPlugin} from '../sql-plugin/sql-plugin.js';

const plugin = loadPlugin(new URL('remove-debugger.sql', import.meta.url).pathname);

const test = createTest(import.meta.url, {
    plugins: [
        ['remove-debugger', plugin],
    ],
});

test('plugins: remove-debugger: process: debugger', async ({process}) => {
    await process('remove-debugger-debugger');
});

test('plugins: remove-debugger: process: statement-list', async ({process}) => {
    await process('remove-debugger-statement-list');
});

test('plugins: remove-debugger: process: if-consequent', async ({process}) => {
    await process('remove-debugger-if-consequent');
});

test('plugins: remove-debugger: no process: no-debugger', async ({noProcess}) => {
    await noProcess('remove-debugger-no-debugger-no-report');
});

test('plugins: remove-debugger: remove-debugger-debugger', async ({comparePlaces}) => {
    await comparePlaces('remove-debugger-debugger', [{
        file: 'fixture.js',
        message: `Avoid 'debugger' statement`,
        position: {
            line: 1,
            column: 0,
        },
        rule: 'remove-debugger',
    }]);
});
