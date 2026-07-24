import {operator} from 'putout';

const {addArgs} = operator;

const TEST = [
    'test("__a", async (__args) => __body)',
    'test.only("__a", async (__args) => __body)',
    'test.skip("__a", async (__args) => __body)',
];

export const {
    report,
    fix,
    traverse,
} = addArgs({
    transaction: ['{transaction}', TEST],
    run: ['{run}', TEST],
    exec: ['{exec}', TEST],
    all: ['{all}', TEST],
    get: ['{get}', TEST],
    insert: ['{insert}', TEST],
    upsert: ['{upsert}', TEST],
    end: ['{end}', TEST],
});
