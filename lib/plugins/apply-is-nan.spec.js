import {createTest} from '#putnik/test';
import {loadSqlPlugin} from '../sql-plugin/sql-plugin.js';

const plugin = loadSqlPlugin(new URL('apply-is-nan.sql', import.meta.url).pathname);

const test = createTest(import.meta.url, {
    plugins: [['apply-is-nan', plugin]],
});

test('plugins: apply-is-nan: process', async ({process}) => {
    await process('apply-is-nan');
});

test('plugins: apply-is-nan: no process', async ({noProcess}) => {
    await noProcess('apply-is-nan-no-report');
});

test('plugins: apply-is-nan: compare places', async ({comparePlaces}) => {
    await comparePlaces('apply-is-nan', [{
        message: 'Prefer Number.isNaN over === NaN',
        position: {line: 1, column: 4},
    }]);
});
