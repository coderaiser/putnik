import {createTest as createProcessorTest} from '@putout/test/processor';

import {
    parse,
    transform,
    print,
} from '../lib/putnik.js';

const createLint = (options) => async (rawSource, {fix}) => {
    const name = 'fixture.js';
    const db = await parse(name, rawSource);
    const places = await transform(name, db, {
        ...options,
        fix,
    });
    const processedSource = fix ? await print(name, db) : rawSource;
    
    return [processedSource, places];
};

export const createTest = (url, options) => createProcessorTest(url, {
    ...options,
    processorRunners: [{
        isMatch: () => true,
        lint: createLint(options),
    }],
});
