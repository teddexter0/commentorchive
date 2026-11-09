// Restore unchanged static assets from the pinned, public release source.
// No npm dependencies and no private credentials are needed.
import { access, mkdir, writeFile } from 'node:fs/promises';
const commit = 'ed448701031ad749f77a8770560e50638a00ab64';
const assets = {
  ocr: ['eng.traineddata.gz','tesseract-core-lstm.wasm','tesseract-core-lstm.wasm.js','tesseract.min.js','worker.min.js','LICENSE-TesseractJS.md','NOTICE.txt'],
  fonts: ['InstrumentSans-Variable.woff2','InstrumentSerif-Regular.woff2','OFL-Instrument-Sans.txt','OFL-Instrument-Serif.txt']
};
await Promise.all(Object.keys(assets).map(dir => mkdir(`dist/${dir}`, {recursive:true})));
await Promise.all(Object.entries(assets).flatMap(([dir, files]) => files.map(async name => {
  const path = `dist/${dir}/${name}`;
  if (await access(path).then(() => true, () => false)) return;
  const response = await fetch(`https://raw.githubusercontent.com/teddexter0/commentorchive/${commit}/${path}`);
  if (!response.ok) throw new Error(`Cannot restore asset ${path}: ${response.status}`);
  await writeFile(path, new Uint8Array(await response.arrayBuffer()));
})));
console.log('Static archive ready, including pinned OCR and font assets.');
const fields = { apiKey: 'API_KEY', authDomain: 'AUTH_DOMAIN', projectId: 'PROJECT_ID', appId: 'APP_ID' };
const firebase = Object.fromEntries(Object.entries(fields).map(([key, suffix]) => [key, process.env['FIREBASE_WEB_' + suffix]]));
if (Object.values(firebase).some(Boolean)) {
  if (!Object.values(firebase).every(Boolean)) throw new Error('Incomplete Firebase web configuration.');
  await writeFile('dist/config.js', 'window.COMMENTARY_CONFIG = Object.freeze(' + JSON.stringify({ firebase }) + ');\n');
}
