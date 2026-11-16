import {createTest} from '#putnik/test';
import {loadPlugin} from '../sql-plugin/sql-plugin.js';

const plugin = loadPlugin(new URL('convert-const-to-let.sql', import.meta.url).pathname);

const test = createTest(import.meta.url, {
    extension: 'ts',
    plugins: [
        ['convert-const-to-let', plugin],
    ],
});

test('plugins: convert-const-to-let: no process: declare-module', async ({noProcess}) => {
    await noProcess('convert-const-to-let-declare-module-no-report');
});

test('plugins: convert-const-to-let: no process: declare', async ({noProcess}) => {
    await noProcess('convert-const-to-let-declare-no-report');
});

test('plugins: convert-const-to-let: no process: type', async ({noProcess}) => {
    await noProcess('convert-const-to-let-type-no-report');
});
