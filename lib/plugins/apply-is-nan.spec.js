import {createTest} from '#putnik/test';
import {loadPlugin} from '../sql-plugin/sql-plugin.js';

const plugin = loadPlugin(new URL('apply-is-nan.sql', import.meta.url).pathname);

const test = createTest(import.meta.url, {
    plugins: [
        ['apply-is-nan', plugin],
    ],
});

test('plugins: apply-is-nan: process: identifier', async ({process}) => {
    await process('apply-is-nan-identifier');
});

test('plugins: apply-is-nan: process: member', async ({process}) => {
    await process('apply-is-nan-member');
});

test('plugins: apply-is-nan: process: call', async ({process}) => {
    await process('apply-is-nan-call');
});

test('plugins: apply-is-nan: no process: argument-of-call', async ({noProcess}) => {
    await noProcess('apply-is-nan-argument-of-call-no-report');
});

test('plugins: apply-is-nan: no process: other-file-id-collision', async ({noProcess}) => {
    await noProcess('apply-is-nan-other-file-id-collision-no-report');
});

test('plugins: apply-is-nan: no process: nan-on-left', async ({noProcess}) => {
    await noProcess('apply-is-nan-nan-on-left-no-report');
});

test('plugins: apply-is-nan: no process: not-strict', async ({noProcess}) => {
    await noProcess('apply-is-nan-not-strict-no-report');
});

test('plugins: apply-is-nan: no process: unsupported-left', async ({noProcess}) => {
    await noProcess('apply-is-nan-unsupported-left-no-report');
});

test('plugins: apply-is-nan: apply-is-nan-identifier', async ({comparePlaces}) => {
    await comparePlaces('apply-is-nan-identifier', [{
        file: 'fixture.js',
        message: `Use 'isNaN' instead of comparing`,
        position: {
            line: 1,
            column: 4,
        },
        rule: 'apply-is-nan',
    }]);
});
