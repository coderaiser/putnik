import {createTest} from '#putnik/test';
import {loadPlugin} from '../sql-plugin/sql-plugin.js';

const plugin = loadPlugin(new URL('merge-duplicate-imports.sql', import.meta.url).pathname);

const test = createTest(import.meta.url, {
    plugins: [
        ['merge-duplicate-imports', plugin],
    ],
});

test('plugins: merge-duplicate-imports: process: couple-defaults', async ({process}) => {
    await process('merge-duplicate-imports-couple-defaults');
});

test('plugins: merge-duplicate-imports: no process: couple-same-defaults', async ({noProcess}) => {
    await noProcess('merge-duplicate-imports-couple-same-defaults-no-report');
});

test('plugins: merge-duplicate-imports: process: duplicate', async ({process}) => {
    await process('merge-duplicate-imports-duplicate');
});

test('plugins: merge-duplicate-imports: no process: namespace', async ({noProcess}) => {
    await noProcess('merge-duplicate-imports-namespace-no-report');
});

test('plugins: merge-duplicate-imports: merge-duplicate-imports-couple-defaults', async ({comparePlaces}) => {
    await comparePlaces('merge-duplicate-imports-couple-defaults', [{
        file: 'fixture.js',
        message: 'Avoid duplicate imports',
        position: {
            line: 2,
            column: 0,
        },
        rule: 'merge-duplicate-imports',
    }]);
});
