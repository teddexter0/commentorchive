// Restore unchanged OCR assets from the pinned, public release source.
// No npm dependencies and no private credentials are needed.
import { access, mkdir, writeFile } from 'node:fs/promises';
const commit = '2f92c4eaed2908b32a06a599a5d12f7cfa4fd266';
const files = ['eng.traineddata.gz','tesseract-core-lstm.wasm','tesseract-core-lstm.wasm.js','tesseract.min.js','worker.min.js','LICENSE-TesseractJS.md','NOTICE.txt'];
await mkdir('dist/ocr', {recursive:true});
await Promise.all(files.map(async name => {
  const path = `dist/ocr/${name}`;
  if (await access(path).then(() => true, () => false)) return;
  const response = await fetch(`https://raw.githubusercontent.com/teddexter0/commentorchive/${commit}/dist/ocr/${name}`);
  if (!response.ok) throw new Error(`Cannot restore OCR asset ${name}: ${response.status}`);
  await writeFile(path, new Uint8Array(await response.arrayBuffer()));
}));
console.log('Static archive ready, including pinned OCR assets.');
const fields = { apiKey: 'API_KEY', authDomain: 'AUTH_DOMAIN', projectId: 'PROJECT_ID', appId: 'APP_ID' };
const firebase = Object.fromEntries(Object.entries(fields).map(([key, suffix]) => [key, process.env['FIREBASE_WEB_' + suffix]]));
if (Object.values(firebase).some(Boolean)) {
  if (!Object.values(firebase).every(Boolean)) throw new Error('Incomplete Firebase web configuration.');
  await writeFile('dist/config.js', 'window.COMMENTARY_CONFIG = Object.freeze(' + JSON.stringify({ firebase }) + ');\n');
}
