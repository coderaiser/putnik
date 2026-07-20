import {run} from 'madrun';

export default {
    'lint': () => 'putout .',
    'fresh:lint': () => run('lint', '--fresh'),
    'lint:fresh': () => run('lint', '--fresh'),
    'fix:lint': () => run('lint', '--fix'),
    'test': () => 'tape lib/**/*.spec.js',
    'watch:test': async () => await run('watcher', `"${await run('test')}"`),
    'watch:tape': () => 'nodemon -w lib --exec tape',
    'watch:coverage:base': async () => await run('watcher', `nyc "${await run('test')}"`),
    'watch:coverage:tape': () => run('watcher', 'nyc tape'),
    'watch:coverage': async () => await run('watch:coverage:base'),
    'watcher': () => 'nodemon -w test -w lib --exec',
    'coverage': async () => `c8 ${await run('test')}`,
    'report': () => 'c8 report --reporter=lcov',
    'postpublish': () => 'npm i -g',
};
