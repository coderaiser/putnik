import {createTest as createProcessorTest} from '@putout/test/processor';
import {
    parse,
    transform,
    print,
} from '../lib/putnik.js';

const createLint = ({extension, ...options}) => async (rawSource, {fix}) => {
    const name = `fixture.${extension}`;
    const db = await parse(name, rawSource, {
        bindings: options.plugins.some(([, plugin]) => plugin.needsScope),
    });
    
    const places = await transform(name, db, {
        ...options,
        fix,
    });
    
    const processedSource = fix ? await print(name, db) : rawSource;
    
    return [processedSource, places];
};

export const createTest = (url, {extension = 'js', ...options}) => createProcessorTest(url, {
    ...options,
    extension,
    processorRunners: [{
        files: ['*'],
        isMatch: () => true,
        lint: createLint({
            ...options,
            extension,
        }),
    }],
});
