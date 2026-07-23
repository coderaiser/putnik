import {test} from 'supertape';

export const createTest = (createDb) => {
    const extendedTest = test.extend({
        exec: (t) => async (query) => {
            const db = await createDb();
            await db.exec(query);
            return t.pass('exec did not throw');
        },

        all: (t) => async (rows, expected) => t.deepEqual(rows, expected),
        get: (t) => async (row, expected) => t.deepEqual(row, expected),
        insert: (t) => async (id, expected) => t.equal(id, expected),
        upsert: (t) => async (row, expected) => t.equal(row?.value, expected),
        dialect: (t) => async (value) => t.ok(typeof value === 'string' && value.length > 0),
        primaryKey: (t) => async (value) => t.ok(typeof value === 'string' && value.length > 0),
    });

    return (name, fn) => {
        return extendedTest(name, async (t) => {
            const db = await createDb();
            return fn({...t, db});
        });
    };
};


