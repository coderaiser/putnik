import {createTest} from '#putnik/test';
import {loadPlugin} from '../sql-plugin/sql-plugin.js';

const plugin = loadPlugin(new URL('remove-duplicate-keys.sql', import.meta.url).pathname);

const test = createTest(import.meta.url, {
    extension: 'ts',
    plugins: [
        ['remove-duplicate-keys', plugin],
    ],
});

test('plugins: remove-duplicate-keys: no process: as', async ({noProcess}) => {
    await noProcess('remove-duplicate-keys-as-no-report');
});
