import {test, stub} from 'supertape';
import {tryToCatch} from 'try-to-catch';
import {
    parseConfig,
    readConfig,
    getDatabase,
} from './config.js';

test('config: parseConfig: reads strings and arrays', (t) => {
    const result = parseConfig(`file = "a.db"\ninclude = ["lib/**/*.js"]\n`);
    const expected = {
        file: 'a.db',
        include: ['lib/**/*.js'],
    };
    
    t.deepEqual(result, expected);
    t.end();
});

test('config: parseConfig: broken toml throws', async (t) => {
    const [error] = await tryToCatch(async () => parseConfig('file = '));
    
    t.match(error.message, `Cannot parse '.putnik.toml'`);
    t.end();
});

test('config: readConfig: no file gives an empty config', async (t) => {
    const result = await readConfig({
        readFile: stub().rejects(Error('ENOENT')),
    }, '/p');
    
    const expected = {};
    
    t.deepEqual(result, expected);
    t.end();
});

test('config: readConfig: reads .putnik.toml of the directory', async (t) => {
    const names = [];
    const result = await readConfig({
        readFile: (name) => {
            names.push(name);
            return 'file = "a.db"\n';
        },
    }, '/p');
    
    const expected = [
        ['/p/.putnik.toml'], {
            file: 'a.db',
        },
    ];
    
    t.deepEqual([names, result], expected);
    t.end();
});

test('config: getDatabase: flag --file', (t) => {
    const result = getDatabase({
        file: 'a.db',
    }, {});
    
    t.equal(result, 'a.db');
    t.end();
});

test('config: getDatabase: file of the config', (t) => {
    const result = getDatabase({}, {
        file: 'b.db',
    });
    
    t.equal(result, 'b.db');
    t.end();
});

test('config: getDatabase: flag overrides config', (t) => {
    const result = getDatabase({
        file: 'a.db',
    }, {
        file: 'b.db',
    });
    
    t.equal(result, 'a.db');
    t.end();
});

test('config: getDatabase: url', (t) => {
    const result = getDatabase({
        url: 'postgresql://localhost/a',
    }, {});
    
    const expected = {
        dialect: 'postgres',
        connection: 'postgresql://localhost/a',
    };
    
    t.deepEqual(result, expected);
    t.end();
});

test('config: getDatabase: nothing is specified', async (t) => {
    const [error] = await tryToCatch(async () => getDatabase({}, {}));
    
    t.match(error.message, `Specify '--file', '--url'`);
    t.end();
});
