import { access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
for (const file of ['public/index.html','public/style.css','public/app.js','api/gateway.js','vercel.json']) {
  await access(fileURLToPath(new URL(file, root)));
}
console.log('Ready: public/ contains the site; api/gateway.js provides the Vercel API.');
