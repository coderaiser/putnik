import {createTest} from '#putnik/test';
import {loadPlugin} from '../sql-plugin/sql-plugin.js';

const plugin = loadPlugin(new URL('remove-duplicate-keys.sql', import.meta.url).pathname);

const test = createTest(import.meta.url, {
    plugins: [
        ['remove-duplicate-keys', plugin],
    ],
});

test('plugins: remove-duplicate-keys: process: a-lot', async ({process}) => {
    await process('remove-duplicate-keys-a-lot');
});

test('plugins: remove-duplicate-keys: no process: call-in-computed-key', async ({noProcess}) => {
    await noProcess('remove-duplicate-keys-call-in-computed-key-no-report');
});

test('plugins: remove-duplicate-keys: no process: call', async ({noProcess}) => {
    await noProcess('remove-duplicate-keys-call-no-report');
});

test('plugins: remove-duplicate-keys: process: computed', async ({process}) => {
    await process('remove-duplicate-keys-computed');
});

test('plugins: remove-duplicate-keys: process: condition', async ({process}) => {
    await process('remove-duplicate-keys-condition');
});

test('plugins: remove-duplicate-keys: process: couple', async ({process}) => {
    await process('remove-duplicate-keys-couple');
});

test('plugins: remove-duplicate-keys: process: duplicate-literal', async ({process}) => {
    await process('remove-duplicate-keys-duplicate-literal');
});

test('plugins: remove-duplicate-keys: no process: extract', async ({noProcess}) => {
    await noProcess('remove-duplicate-keys-extract-no-report');
});

test('plugins: remove-duplicate-keys: process: member', async ({process}) => {
    await process('remove-duplicate-keys-member');
});

test('plugins: remove-duplicate-keys: no process: no-duplicate', async ({noProcess}) => {
    await noProcess('remove-duplicate-keys-no-duplicate-no-report');
});

test('plugins: remove-duplicate-keys: no process: object-pattern-nested', async ({noProcess}) => {
    await noProcess('remove-duplicate-keys-object-pattern-nested-no-report');
});

test('plugins: remove-duplicate-keys: no process: object-pattern-rename', async ({noProcess}) => {
    await noProcess('remove-duplicate-keys-object-pattern-rename-no-report');
});

test('plugins: remove-duplicate-keys: process: object-pattern', async ({process}) => {
    await process('remove-duplicate-keys-object-pattern');
});

test('plugins: remove-duplicate-keys: no process: rename', async ({noProcess}) => {
    await noProcess('remove-duplicate-keys-rename-no-report');
});

test('plugins: remove-duplicate-keys: process: spread', async ({process}) => {
    await process('remove-duplicate-keys-spread');
});

test('plugins: remove-duplicate-keys: remove-duplicate-keys-a-lot', async ({comparePlaces}) => {
    await comparePlaces('remove-duplicate-keys-a-lot', [{
        file: 'fixture.js',
        message: `Avoid duplicate keys: 'source'`,
        position: {
            line: 5,
            column: 4,
        },
        rule: 'remove-duplicate-keys',
    }]);
});
