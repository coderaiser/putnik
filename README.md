# Putnik [![License][LicenseIMGURL]][LicenseURL] [![NPM version][NPMIMGURL]][NPMURL] [![Build Status][BuildStatusIMGURL]][BuildStatusURL] [![Coverage Status][CoverageIMGURL]][CoverageURL]

[NPMIMGURL]: https://img.shields.io/npm/v/putnik.svg?style=flat
[BuildStatusURL]: https://github.com/coderaiser/putnik/actions?query=workflow%3A%22Node+CI%22 "Build Status"
[BuildStatusIMGURL]: https://github.com/coderaiser/putnik/workflows/Node%20CI/badge.svg
[LicenseIMGURL]: https://img.shields.io/badge/license-MIT-317BF9.svg?style=flat
[NPMURL]: https://npmjs.org/package/putnik "npm"
[LicenseURL]: https://tldrlegal.com/license/mit-license "MIT License"
[CoverageURL]: https://coveralls.io/github/coderaiser/putnik?branch=master
[CoverageIMGURL]: https://coveralls.io/repos/coderaiser/putnik/badge.svg?branch=master&service=github

<img width="2609" height="3434" alt="IMG_5196 2" src="https://github.com/user-attachments/assets/4cb07347-9585-4c20-a259-e82cdf7a7025" />

> What if JavaScript AST was stored in SQL Database?

`putnik` is a code transformation engine built on top of 🐊[**Putout**](https://github.com/coderaiser/putout). Instead of traversing the AST in memory with Babel, it writes the AST into a SQLite database, runs SQL-aware plugins against it, then reads the AST back and prints it with `@putout/printer`.

The key idea: **SQL indexes beat Babel traverse at scale**. A plugin that finds `DebuggerStatement` nodes does not visit every node in the file — it queries one table with one index hit.

## Install

```sh
npm i putnik
```

`package.json` must have `"type": "module"`.

## Usage

```js
import {createPutnik} from 'putnik';

const putnik = createPutnik();

putnik.parse('src/index.js', 'const a = 1;');

const constPlugin = {
    select: `SELECT id FROM VariableDeclaration WHERE file = :file AND kind = 'const'`,
    report: `SELECT 'Prefer let over const' AS message, start_line AS line, start_col AS col FROM VariableDeclaration WHERE file = :file AND kind = 'const'`,
    fix: `UPDATE VariableDeclaration SET kind = 'let' WHERE file = :file AND kind = 'const'`,
};

// report mode — returns places, does not mutate
const places = putnik.run('src/index.js', [constPlugin]);

// [{message: 'Prefer let over const', line: 1, col: 0}]
// fix mode — mutates the DB
putnik.run('src/index.js', [constPlugin], {
    fix: true,
});

// read back and print
console.log(putnik.print('src/index.js'));
// let a = 1;
```

## API

### `createPutnik(options?)`

```js
import {createPutnik} from 'putnik';

const inMemoryPutnik = createPutnik();
const persistentPutnik = createPutnik({
    connection: '.putnik.db',
});
```

Returns `{ parse, run, getAst, print, db }`.

| option       | default      | description                          |
|--------------|--------------|--------------------------------------|
| `connection` | `':memory:'` | path to SQLite file, or `':memory:'` |

***

### `parse(file, source)`

Parses `source` with `@putout/babel` and writes every AST node into its typed table. Call once per file before `run`.

```js
putnik.parse('src/index.js', 'const a = 1;');
```

Each Babel node type gets its own table. Every row shares these base columns:

| column       | type    | description                                    |
|--------------|---------|------------------------------------------------|
| id           | INTEGER | primary key                                    |
| file         | TEXT    | source file path                               |
| parent_id    | INTEGER | id of the parent node                          |
| parent_field | TEXT    | field name on parent (`id`, `init`, `body`, …) |
| start_line   | INT     | location                                       |
| start_col    | INT     | location                                       |
| end_line     | INT     | location                                       |
| end_col      | INT     | location                                       |

Type-specific columns: `kind` on `VariableDeclaration`, `name` on `Identifier`, `value` on `StringLiteral` and `NumericLiteral`.

***

### `run(file, plugins, opts?)`

```js
// report mode — does not mutate the DB
const places = putnik.run('src/index.js', [plugin]);

// fix mode — mutates the DB
putnik.run('src/index.js', [plugin], {
    fix: true,
});
```

Returns an array of place objects:

```js
[{
    message: 'Prefer let over const',
    line: 1,
    col: 0,
}];
```

***

### `print(file)`

Reads all nodes for `file` from the DB, assembles the AST, and returns the printed source string via `@putout/printer`. Returns `''` if the file has not been parsed.

```js
const code = putnik.print('src/index.js');
// 'let a = 1;\n'
```

### `getAst(file)`

Same as `print` but returns the raw AST object instead of printing it.

```js
const ast = putnik.getAst('src/index.js');
```

### `sql` tagged template

```js
import {sql} from 'putnik';

const query = sql`SELECT id FROM VariableDeclaration WHERE file = ${file}`;
```

## Plugin shape

A plugin is a plain object with three SQL strings:

```js
const constPlugin = {
    // which rows to match
    select: `SELECT id FROM VariableDeclaration WHERE file = :file AND kind = 'const'`,
    // what to report (must return message, line, col)
    report: `SELECT 'Prefer let over const' AS message, start_line AS line, start_col AS col
             FROM VariableDeclaration WHERE file = :file AND kind = 'const'`,
    // how to fix (only run when fix: true)
    fix: `UPDATE VariableDeclaration SET kind = 'let' WHERE file = :file AND kind = 'const'`,
};
```

Plugins can also be loaded from `.sql` files using tagged sections:

```sql
-- @select
SELECT id FROM VariableDeclaration WHERE file = :file AND kind = 'const';
-- @report
SELECT 'Prefer let over const' AS message,
       start_line AS line, start_col AS col
FROM VariableDeclaration WHERE file = :file AND kind = 'const';
-- @fix
UPDATE VariableDeclaration SET kind = 'let'
WHERE file = :file AND kind = 'const';
```

```js
import {loadSqlPlugin} from 'putnik';

const plugin = loadSqlPlugin('./plugins/const-to-let.sql');
```

`loadSqlPlugin` parses the file, validates that `@select`/`@report` are `SELECT` statements and `@fix` is an `UPDATE`, and throws if they are not.

## Low-level exports

These are used internally but exported for advanced use:

```js
import {
    createDb,
    createTable,
    createAllTables,
    createIndexForField,
    createView,
    writeAst,
    readAst,
    runPlugin,
    parseSqlPlugin,
    validatePlugin,
    loadSqlPlugin,
} from 'putnik';
```

`createIndexForField(db, type, field)` — adds an index on a specific column, useful when a plugin queries a field that doesn't have one by default:

```js
createIndexForField(db, 'VariableDeclaration', 'kind');
```

## Modes

| mode   | DB mutated | return value                                   |
|--------|------------|------------------------------------------------|
| report | no         | array of `{message, line, col}`                |
| fix    | yes        | array of `{message, line, col}` after mutation |

## Cross-file transforms

Because all files share one DB, a plugin can query across the whole project:

```js
import {readFileSync} from 'node:fs';
import {createPutnik} from 'putnik';

const putnik = createPutnik({
    connection: '.putnik.db',
});

for (const file of files)
    putnik.parse(file, readFileSync(file, 'utf8'));

const unusedExports = {
    select: `
        SELECT e.id FROM ExportDeclaration e
        LEFT JOIN ImportDeclaration i ON i.name = e.name AND i.file != e.file
        WHERE i.id IS NULL AND e.file = :file`,
    report: `
        SELECT 'Unused export' AS message, start_line AS line, start_col AS col
        FROM ExportDeclaration e
        LEFT JOIN ImportDeclaration i ON i.name = e.name AND i.file != e.file
        WHERE i.id IS NULL AND e.file = :file`,
};

const places = putnik.run(targetFile, [unusedExports]);
```

## License

MIT
