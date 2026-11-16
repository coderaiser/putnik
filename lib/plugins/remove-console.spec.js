import {createTest} from '#putnik/test';
import {loadPlugin} from '../sql-plugin/sql-plugin.js';

const plugin = loadPlugin(new URL('remove-console.sql', import.meta.url).pathname);

const test = createTest(import.meta.url, {
    plugins: [
        ['remove-console', plugin],
    ],
});

test('plugins: remove-console: process: declared', async ({process}) => {
    await process('remove-console-declared');
});

test('plugins: remove-console: process: property-identifier', async ({process}) => {
    await process('remove-console-property-identifier');
});

test('plugins: remove-console: process: property-literal', async ({process}) => {
    await process('remove-console-property-literal');
});

test('plugins: remove-console: process: time', async ({process}) => {
    await process('remove-console-time');
});
