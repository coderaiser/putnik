# Putnik [![License][LicenseIMGURL]][LicenseURL] [![NPM version][NPMIMGURL]][NPMURL] [![Build Status][BuildStatusIMGURL]][BuildStatusURL] [![Coverage Status][CoverageIMGURL]][CoverageURL]

[NPMIMGURL]: https://img.shields.io/npm/v/putnik.svg?style=flat
[BuildStatusURL]: https://github.com/coderaiser/putnik/actions?query=workflow%3A%22Node+CI%22 "Build Status"
[BuildStatusIMGURL]: https://github.com/coderaiser/putnik/workflows/Node%20CI/badge.svg
[LicenseIMGURL]: https://img.shields.io/badge/license-MIT-317BF9.svg?style=flat
[NPMURL]: https://npmjs.org/package/putnik "npm"
[LicenseURL]: https://tldrlegal.com/license/mit-license "MIT License"
[CoverageURL]: https://coveralls.io/github/coderaiser/putnik?branch=master
[CoverageIMGURL]: https://coveralls.io/repos/coderaiser/putnik/badge.svg?branch=master&service=github

<img width="3024" height="4032" alt="IMG_5196" src="https://github.com/user-attachments/assets/cd6da7ce-d1b8-42b2-8a3a-8f430b838427" />

> Babel AST stored in SQL, transformed by plugins, printed back to code.

`putnik` is a code transformation engine built on top of 🐊[**Putout**](https://github.com/coderaiser/putout). Instead of traversing the AST in memory with Babel, it writes the AST into a SQLite (or Postgres) database, runs SQL-aware plugins against it, then reads the AST back and prints it with `@putout/printer`.

The key idea: **SQL indexes beat Babel traverse at scale**. A plugin that finds `DebuggerStatement` nodes does not visit every node in the file — it queries one table with one index hit.

## Install

```
npm i putnik
```

## Install

```sh
npm i putnik better-sqlite3 @putout/babel @putout/printer
```

`package.json` must have `"type": "module"`.

## Usage

```js
import {createPutnik} from './putnik.js';

const putnik = createPutnik();

putnik.parse('src/index.js', 'const a = 1;');

const plugin = {
    message: 'Prefer let over const',
    include: () => [
        'VariableDeclaration',
    ],
    fix(node) {
        node.kind = 'let';
    },
};

// select mode — report only
const places = putnik.run('src/index.js', [plugin]);

// [{rule, message, position: {line, column}}]
// fix mode — mutate db
putnik.run('src/index.js', [plugin], {
    fix: true,
});

// read back and print
console.log(putnik.print('src/index.js'));
// let a = 1;
```

***

## Main parts

### `createPutnik(options?)` — public API

```js
import {createPutnik} from './putnik.js';

const inMemoryPutnik = createPutnik();
const sqlitePutnik = createPutnik({
    connection: '.putnik.db',
});
```

Returns `{ parse, run, getAst, print, db }`.

### `parse(file, source)` — write AST to DB

Parses source with `@putout/babel` and inserts every node into its typed table. Called once per file before `run`.

```js
putnik.parse('src/index.js', 'const a = 1;');
```

Each Babel node type gets its own table. Every row shares base columns:

| column       | type    | description                                    |
|--------------|---------|------------------------------------------------|
| id           | INTEGER | primary key, auto-increment                    |
| file         | TEXT    | source file path                               |
| parent_id    | INTEGER | id of parent node                              |
| parent_field | TEXT    | field name on parent (`id`, `init`, `body`, …) |
| start_line   | INT     | location                                       |
| start_col    | INT     | location                                       |
| end_line     | INT     | location                                       |
| end_col      | INT     | location                                       |

Plus type-specific columns: `kind` on `VariableDeclaration`, `name` on `Identifier`, `value` on `StringLiteral` and `NumericLiteral`.

### `run(file, plugins, opts?)` — run plugins

```js
// select mode — report only, db not mutated
const places = putnik.run('src/index.js', [plugin]);

// fix mode — mutates db
putnik.run('src/index.js', [plugin], {
    fix: true,
});
```

Returns an array of places:

```js
[{
    rule: 'Prefer let over const',
    message: 'Prefer let over const',
    position: {
        line: 1,
        column: 0,
    },
}];
```

***

### `print(file)` — read AST from DB and print

Fetches all nodes for the file in one SQL query, assembles the tree in memory, and passes it to `@putout/printer`.

```js
const code = putnik.print('src/index.js');
// 'let a = 1;\n'
```

***

### `getAst(file)` — read AST as a JS object

Same as `print` but returns the raw AST object instead of printing it. Useful for passing to other putout tools.

```js
const ast = putnik.getAst('src/index.js');
```

## Plugin shape

### `include` + `fix` — simple transform

```js
const pluginConstToLet = {
    message: 'Prefer let over const',
    
    include: () => [
        'VariableDeclaration',
    ],
    
    fix(node) {
        node.kind = 'let';
    },
};
```

`include` returns the node types to fetch. The runner queries each type table, hands each row to `fix` as a proxied node. Mutations are collected into a plan and written to the DB in one transaction.

### Node factories — replace a node with a different type

```js
import {createPutnik, StringLiteral} from './putnik.js';

const pluginNumericToString = {
    message: 'Replace numeric init with string',
    
    include: () => [
        'NumericLiteral',
    ],
    
    fix(node) {
        node.value = StringLiteral('hello');
    },
};
```

Assigning a factory value (`StringLiteral`, `NumericLiteral`, `Identifier`) triggers a `replace` plan step: the old node row is deleted, a new typed row is inserted.

### `select` — raw SQL for complex or cross-file queries

```js
import {sql} from './putnik.js';

const pluginFindUnusedExports = {
    message: 'Unused export',
    
    select: sql`
        SELECT e.id, e.file, e.start_line, e.start_col
        FROM   ExportDeclaration e
        LEFT JOIN ImportDeclaration i
            ON  i.name = e.name
            AND i.file != e.file
        WHERE  i.id IS NULL
        AND    e.file = :file
    `,
    
    fix(node) {
        node.remove();
    },
};
```

Use the `sql` tagged template for editor SQL highlighting. Raw SQL plugins can `JOIN` across tables and across files — impossible with Babel traverse.

All nodes live in per-type tables. The `file_nodes` view unions them for single-query print:

```sql
SELECT * FROM file_nodes WHERE file = 'src/index.js'
```

## Two modes

| mode   | what happens               | DB mutated |
|--------|----------------------------|------------|
| select | returns places (lint)      | no         |
| fix    | mutates DB, returns places | yes        |

## Cross-file transform

Because all files share one DB, a plugin can match across the whole project in one query:

```js
import {readFileSync} from 'node:fs';
import {createPutnik, sql} from './putnik.js';

const putnik = createPutnik({
    connection: '.putnik.db',
});

// parse all files first
for (const file of files)
    putnik.parse(file, readFileSync(file, 'utf8'));

// find unused exports across all files in one query
const plugin = {
    message: 'Unused export',
    
    select: sql`
        SELECT e.id, e.file, e.name, e.start_line, e.start_col
        FROM   ExportDeclaration e
        LEFT JOIN ImportDeclaration i
            ON  i.name = e.name
            AND i.file != e.file
        WHERE  i.id IS NULL
    `,
};

const places = putnik.run(null, [plugin]);
```

## License

MIT
