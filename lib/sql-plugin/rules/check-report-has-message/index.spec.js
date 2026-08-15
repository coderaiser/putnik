import {createTest} from '@putout/test';
import * as plugin from './index.js';

const test = createTest(import.meta.url, {
    plugins: [['check-report-has-message', plugin]],
});

test('sql-plugin: check-report-has-message: report', (t) => {
    t.report('check-report-has-message', `@report SELECT must include a 'message' column`);
    t.end();
});

test('sql-plugin: check-report-has-message: no report: with-message', (t) => {
    t.noReport('with-message');
    t.end();
});
