import {createPutnik} from '../lib/putnik.js';
import {pluginConstToLet} from '../lib/plugins/const-to-let.js';

const putnik = createPutnik();

putnik.parse('src/index.js', 'const a = 1;');

const plugins = [pluginConstToLet];

const places = putnik.run('src/index.js', plugins);

console.log(places);
