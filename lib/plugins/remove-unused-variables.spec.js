import {createTest} from '#putnik/test';
import {loadPlugin} from '../sql-plugin/sql-plugin.js';

const plugin = loadPlugin(new URL('remove-unused-variables.sql', import.meta.url).pathname);

const test = createTest(import.meta.url, {
    plugins: [
        ['remove-unused-variables', plugin],
    ],
});

test('plugins: remove-unused-variables: process: comments-if', async ({process}) => {
    await process('remove-unused-variables-comments-if');
});

test('plugins: remove-unused-variables: no process: destr-nested-vars', async ({noProcess}) => {
    await noProcess('remove-unused-variables-destr-nested-vars-no-report');
});

test('plugins: remove-unused-variables: process: fn-call-vars', async ({process}) => {
    await process('remove-unused-variables-fn-call-vars');
});

test('plugins: remove-unused-variables: no process: fn-call', async ({noProcess}) => {
    await noProcess('remove-unused-variables-fn-call-no-report');
});

test('plugins: remove-unused-variables: process: fn-vars', async ({process}) => {
    await process('remove-unused-variables-fn-vars');
});

test('plugins: remove-unused-variables: no process: import-specifier', async ({noProcess}) => {
    await noProcess('remove-unused-variables-import-specifier-no-report');
});

test('plugins: remove-unused-variables: no process: return-statement', async ({noProcess}) => {
    await noProcess('remove-unused-variables-return-statement-no-report');
});

test('plugins: remove-unused-variables: remove-unused-variables-comments-if', async ({comparePlaces}) => {
    await comparePlaces('remove-unused-variables-comments-if', [{
        file: 'fixture.js',
        message: `'end' is defined but never used`,
        position: {
            line: 4,
            column: 14,
        },
        rule: 'remove-unused-variables',
    }]);
});
