test('test: all on nonexistent table returns empty', async () => {
    const rows = await run('SELECT * FROM nonexistent');
    deepEqual(rows, []);
});

test.only('test: all on nonexistent table returns empty', async () => {
    const rows = await exec('SELECT * FROM nonexistent');
    deepEqual(rows, []);
});

test.skip('test: all on nonexistent table returns empty', async () => {
    const rows = await all('SELECT * FROM nonexistent');
    deepEqual(rows, []);
});

test('test: all on nonexistent table returns empty', async () => {
    await transaction();
});
