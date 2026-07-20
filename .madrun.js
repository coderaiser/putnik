import {run, cutEnv} from 'madrun';

const env = {
    SUPERC8_RESPONSIVE: 1,
};

export default {
    'lint': () => 'putout .',
    'fresh:lint': () => run('lint', '--fresh'),
    'lint:fresh': () => run('lint', '--fresh'),
    'fix:lint': () => run('lint', '--fix'),
    'test': () => 'tape lib/**/*.spec.js',
    'watch:test': async () => [env, await run('watcher', `"${await run('test')}"`)],
    'watch:tape': () => 'nodemon -w lib --exec tape',
    'watch:coverage:base': async () => [env, await run('watcher', `nyc "${await run('test')}"`)],
    'watch:coverage:tape': () => run('watcher', 'nyc tape'),
    'watch:coverage': async () => [env, await cutEnv('watch:coverage:base')],
    'watcher': () => 'nodemon -w test -w lib --exec',
    'coverage': async () => [env, `c8 ${await run('test')}`],
    'report': () => 'c8 report --reporter=lcov',
    'postpublish': () => 'npm i -g',
};
