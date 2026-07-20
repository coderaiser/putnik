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

`putnik` is a code transformation engine built on top of [putout](https://github.com/coderaiser/putout). Instead of traversing the AST in memory with Babel, it writes the AST into a SQLite (or Postgres) database, runs SQL-aware plugins against it, then reads the AST back and prints it with `@putout/printer`.

The key idea: **SQL indexes beat Babel traverse at scale**. A plugin that finds `DebuggerStatement` nodes does not visit every node in the file — it queries one table with one index hit.

## Install

```
npm i putnik
```

## Install

```sh
npm i putnik better-sqlite3 @babel/parser @putout/printer
```

`package.json` must have `"type": "module"`.

***

## Entry point

```
putnik.js
```

One file. All layers are exported individually so each can be unit-tested with `supertape` in isolation.

***

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

Parses source with `@babel/parser` and inserts every node into its typed table. Called once per file before `run`.

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

***

## Schema

```
Program                          (parent_field: 'program')
└── VariableDeclaration          (parent_field: 'body',         kind: 'const')
     └── VariableDeclarator      (parent_field: 'declarations')
          ├── Identifier         (parent_field: 'id',           name: 'a')
          └── NumericLiteral     (parent_field: 'init',         value: 1)
```

All nodes live in per-type tables. The `file_nodes` view unions them for single-query print:

```sql
SELECT * FROM file_nodes WHERE file = 'src/index.js'
```

***

## Two modes

| mode   | what happens               | DB mutated |
|--------|----------------------------|------------|
| select | returns places (lint)      | no         |
| fix    | mutates DB, returns places | yes        |

***

## Testing with supertape

Every internal function is exported individually — tests never need the full `createPutnik` stack.

### Round-trip: parse → read back

```js
import test from 'supertape';
import {parse} from '@babel/parser';
import {
    createDb,
    createAllTables,
    createView,
    writeAst,
    readAst,
} from './putnik.js';

test('round-trip: const a = 1', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    
    const ast = parse('const a = 1;', {
        sourceType: 'module',
    });
    writeAst(db, ast, 'index.js');
    
    const result = readAst(db, 'index.js');
    
    t.equal(result.program.body[0].kind, 'const');
    t.equal(result.program.body[0].declarations[0].id.name, 'a');
    t.equal(result.program.body[0].declarations[0].init.value, 1);
    t.end();
});
```

### Plugin select mode — DB not mutated

```js
import test from 'supertape';
import {parse} from '@babel/parser';
import {
    createDb,
    createAllTables,
    createView,
    writeAst,
    runPlugin,
} from './putnik.js';

test('plugin reports places without mutating db', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    
    const ast = parse('const a = 1;', {
        sourceType: 'module',
    });
    writeAst(db, ast, 'index.js');
    
    const plugin = {
        message: 'Prefer let over const',
        include: () => [
            'VariableDeclaration',
        ],
        fix(node) {
            node.kind = 'let';
        },
    };
    
    const places = runPlugin(db, plugin, 'index.js');
    
    t.equal(places.length, 1);
    t.equal(places[0].message, 'Prefer let over const');
    t.equal(places[0].position.line, 1);
    
    const row = db.get(`SELECT kind FROM VariableDeclaration WHERE file = ?`, ['index.js']);
    t.equal(row.kind, 'const');
    t.end();
});
```

### Plugin fix mode — DB mutated

```js
test('plugin mutates db in fix mode', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    
    const ast = parse('const a = 1;', {
        sourceType: 'module',
    });
    writeAst(db, ast, 'index.js');
    
    const plugin = {
        message: 'Prefer let over const',
        include: () => [
            'VariableDeclaration',
        ],
        fix(node) {
            node.kind = 'let';
        },
    };
    
    runPlugin(db, plugin, 'index.js', {
        fix: true,
    });
    
    const row = db.get(`SELECT kind FROM VariableDeclaration WHERE file = ?`, ['index.js']);
    
    t.equal(row.kind, 'let');
    t.end();
});
```

### `applyPlan` directly

```js
import test from 'supertape';
import {parse} from '@babel/parser';
import {
    createDb,
    createAllTables,
    createView,
    writeAst,
    applyPlan,
} from './putnik.js';

test('applyPlan: update field', (t) => {
    const db = createDb();
    createAllTables(db);
    createView(db);
    
    const ast = parse('const a = 1;', {
        sourceType: 'module',
    });
    writeAst(db, ast, 'index.js');
    
    const row = db.get(`SELECT * FROM VariableDeclaration WHERE file = ?`, ['index.js']);
    
    applyPlan(db, [{
        op: 'update',
        id: row.id,
        type: 'VariableDeclaration',
        key: 'kind',
        value: 'let',
    }]);
    
    const updated = db.get(`SELECT kind FROM VariableDeclaration WHERE id = ?`, [row.id]);
    
    t.equal(updated.kind, 'let');
    t.end();
});
```

### `createNode` proxy — plan capture

```js
import test from 'supertape';
import {createNode} from './putnik.js';

test('proxy captures update into plan', (t) => {
    const row = {
        id: 1,
        type: 'VariableDeclaration',
        file: 'index.js',
        kind: 'const',
    };
    const plan = [];
    const node = createNode(row, plan);
    
    node.kind = 'let';
    
    t.equal(plan.length, 1);
    t.equal(plan[0].op, 'update');
    t.equal(plan[0].key, 'kind');
    t.equal(plan[0].value, 'let');
    t.end();
});
```

***

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

***

## Layers

```
createPutnik          public API — parse, run, getAst, print
    createDb          SQLite adapter (swap for postgres)
    createAllTables   per-type tables + file indexes
    createView        UNION ALL view for single-query print
    writeAst          @babel/parser → INSERT rows
    readAst           one JOIN query → assemble tree in memory
    runPlugin         fetch rows → visit sync → collect plan
    createNode        Proxy — captures mutations into plan
    applyPlan         execute plan in one transaction
    print             readAst → @putout/printer → source string
```

Each layer is a pure function of `db` — import and test individually with `supertape`.

## License

MIT
