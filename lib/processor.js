import * as json from '@putout/processor-json';
import * as toml from '@putout/processor-toml';
import {configurePrinter} from '@putout/cli-process-file/printer';

const PROCESSORS = [json, toml];

const hasExtension = (name) => ({files}) => files.some((pattern) => name.endsWith(pattern.slice(1)));
const getProcessor = (name) => PROCESSORS.find(hasExtension(name));

export const branch = (name, source) => {
    const processor = getProcessor(name);
    
    if (!processor)
        return source;
    
    const [first] = processor.branch(source);
    
    if (!first)
        throw Error(`Cannot parse '${name}'`);
    
    return first.source;
};

export const merge = (name, source) => {
    const processor = getProcessor(name);
    
    if (!processor)
        return source;
    
    return processor.merge('', [source]);
};

export const getPrinter = (name) => {
    if (name.endsWith('.toml'))
        return configurePrinter('file.json');
    
    return configurePrinter(name);
};
