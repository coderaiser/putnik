import {createPutnik, loadSqlPlugin} from '../lib/putnik.js';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pluginConstToLet = loadSqlPlugin(resolve(__dirname, '../lib/plugins/const-to-let.sql'));

const putnik = createPutnik();

putnik.parse('src/index.js', 'const a = 1;');

const plugins = [pluginConstToLet];

const places = putnik.run('src/index.js', plugins);

console.log(places);

