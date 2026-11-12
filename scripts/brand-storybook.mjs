// After `storybook build`: Storybook always writes "<title>… - Storybook</title>" in index.html
// (shown before JavaScript runs, and by link previews). Replace it with our name.
import { readFile, writeFile } from 'node:fs/promises';

const BRAND = 'ui-gauge — Lit Web Component';
const file = 'storybook-static/index.html';
const html = await readFile(file, 'utf8');
const next = html.replace(/<title>[^<]*<\/title>/, `<title>${BRAND}</title>`);
if (next === html) throw new Error(`No <title> replaced in ${file}`);
await writeFile(file, next);
console.log(`${file}: <title>${BRAND}</title>`);
