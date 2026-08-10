test('test: all on nonexistent table returns empty', async ({run}) => {
    const rows = await run('SELECT * FROM nonexistent');
    deepEqual(rows, []);
});

test.only('test: all on nonexistent table returns empty', async ({exec}) => {
    const rows = await exec('SELECT * FROM nonexistent');
    deepEqual(rows, []);
});

test.skip('test: all on nonexistent table returns empty', async ({all}) => {
    const rows = await all('SELECT * FROM nonexistent');
    deepEqual(rows, []);
});

test('test: all on nonexistent table returns empty', async ({transaction}) => {
    await transaction();
});
