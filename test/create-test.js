import {test} from 'supertape';

const isString = (a) => typeof a === 'string';
const {assign} = Object;

export const createTest = (createDb) => {
    const extendedTest = test.extend({
        all: (t) => async (rows, expected) => t.deepEqual(rows, expected),
        get: (t) => async (row, expected) => t.deepEqual(row, expected),
        insert: (t) => async (id, expected) => t.equal(id, expected),
        upsert: (t) => async (row, expected) => t.equal(row?.value, expected),
        dialect: (t) => async (value) => t.ok(isString(value) && value.length > 0),
        primaryKey: (t) => async (value) => t.ok(isString(value) && value.length > 0),
    });
    
    const testFn = (name, fn) => {
        return extendedTest(name, async (t) => {
            const db = await createDb();
            return fn({
                ...t,
                db,
            });
        });
    };
    
    assign(testFn, {
        test: testFn,
        skip: (name, fn) => extendedTest.skip(name, async (t) => {
            const db = await createDb();
            return fn({
                ...t,
                db,
            });
        }),
        only: (name, fn) => extendedTest.only(name, async (t) => {
            const db = await createDb();
            return fn({
                ...t,
                db,
            });
        }),
    });
    
    return testFn;
};
