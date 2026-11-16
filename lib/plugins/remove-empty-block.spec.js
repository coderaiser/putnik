import {createTest} from '#putnik/test';
import {loadPlugin} from '../sql-plugin/sql-plugin.js';

const plugin = loadPlugin(new URL('remove-empty-block.sql', import.meta.url).pathname);

const test = createTest(import.meta.url, {
    plugins: [
        ['remove-empty-block', plugin],
    ],
});

test('plugins: remove-empty-block: process: block-fn', async ({process}) => {
    await process('remove-empty-block-block-fn');
});

test('plugins: remove-empty-block: no process: comments', async ({noProcess}) => {
    await noProcess('remove-empty-block-comments-no-report');
});

test('plugins: remove-empty-block: no process: else-comment', async ({noProcess}) => {
    await noProcess('remove-empty-block-else-comment-no-report');
});

test('plugins: remove-empty-block: process: function', async ({process}) => {
    await process('remove-empty-block-function');
});

test('plugins: remove-empty-block: process: top-level', async ({process}) => {
    await process('remove-empty-block-top-level');
});

test('plugins: remove-empty-block: process: try-catch', async ({process}) => {
    await process('remove-empty-block-try-catch');
});

test('plugins: remove-empty-block: remove-empty-block-block-fn', async ({comparePlaces}) => {
    await comparePlaces('remove-empty-block-block-fn', [{
        file: 'fixture.js',
        message: 'Avoid useless empty blocks',
        position: {
            line: 3,
            column: 0,
        },
        rule: 'remove-empty-block',
    }, {
        file: 'fixture.js',
        message: 'Avoid useless empty blocks',
        position: {
            line: 7,
            column: 4,
        },
        rule: 'remove-empty-block',
    }]);
});
