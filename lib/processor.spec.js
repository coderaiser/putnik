import {test} from 'supertape';
import {tryToCatch} from 'try-to-catch';
import {montag} from 'montag';
import {parse, print} from './putnik.js';

const PACKAGE = `{
  "name": "a",
  "version": "1.0.0"
}
`;

const roundTrip = async (name, source) => {
    const db = await parse(name, source);
    const result = await print(name, db);
    
    db.end();
    
    return result;
};

test('processor: json: package.json keeps two spaces of indent', async (t) => {
    const result = await roundTrip('/p/package.json', PACKAGE);
    
    t.equal(result, PACKAGE);
    t.end();
});

test('processor: json: other json has four spaces of indent', async (t) => {
    const result = await roundTrip('/p/a.json', PACKAGE);
    const expected = montag`
        {
            "name": "a",
            "version": "1.0.0"
        }
    
    `;
    
    t.equal(result, expected);
    t.end();
});

test('processor: json: stored as an object expression', async (t) => {
    const db = await parse('/p/a.json', PACKAGE);
    const [{count}] = db.all('SELECT COUNT(*) AS count FROM ObjectProperty');
    
    db.end();
    
    t.equal(count, 2);
    t.end();
});

test('processor: toml: round trip', async (t) => {
    const source = `name = "a"\nversion = "1.0.0"\n`;
    const result = await roundTrip('/p/.putnik.toml', source);
    
    t.equal(result, source);
    t.end();
});

test('processor: toml: broken source throws', async (t) => {
    const [error] = await tryToCatch(parse, '/p/a.toml', 'name = ');
    
    t.ok(error);
    t.end();
});

test('processor: js is not changed', async (t) => {
    const result = await roundTrip('/p/a.js', 'const a = 1;\n');
    
    t.equal(result, 'const a = 1;\n');
    t.end();
});
