import putnik from '../lib/putnik.js';
const src='const a = 1;\nfunction f(x) { return x + 1; }\n';
for (let i=1;i<=300;i++){ await putnik('t.js',src,{fix:false,plugins:[]}); if(i%50==0) console.log(i,Math.round(process.memoryUsage().rss/1048576)+'MB'); }
