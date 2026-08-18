import process from 'node:process';
import {tryToCatch} from 'try-to-catch';
import {test as supertape} from 'supertape';
import {integrationTest} from '#test';
import {createDb} from '../lib/db/turso.js';

const {
    TURSO_URL,
    TURSO_AUTH_TOKEN,
} = process.env;

if (!TURSO_URL)
    supertape.skip('turso integration: set TURSO_URL to run');

const test = integrationTest(() => createDb({
    url: TURSO_URL,
    authToken: TURSO_AUTH_TOKEN,
}));

test('turso: exec creates table', async ({exec, notOk}) => {
    const [error] = await tryToCatch(exec, 'CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY AUTOINCREMENT, x TEXT)');
    notOk(error);
});
