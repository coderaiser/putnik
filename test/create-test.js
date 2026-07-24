import {test} from 'supertape';

const {assign} = Object;

export const createTest = (createDb) => {
    const extendedTest = test.extend();
    
    const wrap = (fn) => async (t) => {
        const db = await createDb();
        const all = db.all.bind(db);
        const get = db.get.bind(db);
        const run = db.run.bind(db);
        const exec = db.exec.bind(db);
        const insert = db.insert.bind(db);
        const end = db.end.bind(db);
        const transaction = db.transaction.bind(db);
        const upsert = db.upsert.bind(db);
        
        return fn({
            ...t,
            all,
            get,
            run,
            exec,
            insert,
            upsert,
            end,
            transaction,
        });
    };
    
    const testFn = (name, fn) => {
        return extendedTest(name, wrap(fn));
    };
    
    assign(testFn, {
        test: testFn,
        skip: (name, fn) => extendedTest.skip(name, wrap(fn)),
        only: (name, fn) => extendedTest.only(name, wrap(fn)),
    });
    
    return testFn;
};
