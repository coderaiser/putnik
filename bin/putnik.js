import putnik, {loadSqlPlugin} from '../lib/putnik.js';

const pluginConstToLet = loadSqlPlugin(new URL('../lib/plugins/const-to-let.sql', import.meta.url).pathname);

const [code, places] = await putnik('src/index.js', 'const a = 1;', {
    plugins: [
        ['const-to-let', pluginConstToLet],
    ],
});

console.log(code);

if (places.length)
    console.log(places);
