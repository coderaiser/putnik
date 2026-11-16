import {join} from 'node:path';
import * as toml from '@putout/processor-toml';
import {fromJS, __toml} from '@putout/operator-json';
import {tryToCatch} from 'try-to-catch';

export const CONFIG_NAME = '.putnik.toml';

export const parseConfig = (source) => {
    const [first] = toml.branch(source);
    
    if (!first)
        throw Error(`Cannot parse '${CONFIG_NAME}'`);
    
    return JSON.parse(fromJS(first.source, __toml));
};

export const readConfig = async (fs, dir) => {
    const [error, source] = await tryToCatch(fs.readFile, join(
        dir,
        CONFIG_NAME,
    ));
    
    if (error)
        return {};
    
    return parseConfig(source);
};

export const getDatabase = (flags, config) => {
    const file = flags.file || config.file;
    const url = flags.url || config.url;
    
    if (file)
        return file;
    
    if (url)
        return {
            dialect: 'postgres',
            connection: url,
        };
    
    throw Error(`Specify '--file', '--url', or '${CONFIG_NAME}'`);
};
