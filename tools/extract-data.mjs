// tools/extract-data.mjs
// Evaluate the prototype's inline DATA <script> blocks in a vm sandbox and
// return the runtime constants. The five data blocks (blocks 1–5) have NO DOM
// dependencies; only block 6 (render/init) touches document, so we exclude it.
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

const HTML_PATH = fileURLToPath(new URL('../app/index.html', import.meta.url));

// Names defined by the data blocks that we want to capture.
const DATA_GLOBALS = [
  'METALS', 'GROUPS', 'COUNTRIES', 'DATA', 'FLOWS',          // data.js + worldmap.js
  'ACTORS', 'LEVERS', 'MATRIX', 'MATRIX_READING',            // matrix.js
  'STRATEGY_FAMILIES', 'STRATEGIES',                          // strategy.js
  'BASKETS', 'INSTRUMENTS', 'PROJECTION', 'NEWS', 'WINLOSE',  // terminal.js
  'WORLD_PATHS'                                               // worldmap.js
];

export function extract() {
  const html = readFileSync(HTML_PATH, 'utf8');
  // Pull every <script> block body.
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  // Keep only blocks that define data globals and do NOT reference the DOM.
  const dataBlocks = blocks.filter(b =>
    DATA_GLOBALS.some(g => new RegExp(`const\\s+${g}\\b`).test(b)) &&
    !/document\.|getElementById|addEventListener/.test(b)
  );
  if (dataBlocks.length === 0) throw new Error('No data blocks found — index.html structure changed.');

  const sandbox = {};
  vm.createContext(sandbox);
  // Expose captured consts: append assignments that lift them onto the context.
  const source = dataBlocks.join('\n;\n') + '\n;\n' +
    DATA_GLOBALS.map(g => `try{ globalThis.__out.${g}=${g}; }catch(e){}`).join('\n');
  sandbox.__out = {};
  vm.runInContext('var globalThis=this;' + source, sandbox, { timeout: 5000 });

  const out = sandbox.__out;
  for (const g of DATA_GLOBALS) {
    if (out[g] === undefined) throw new Error(`Expected global ${g} was not captured.`);
  }
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const data = extract();
  console.log(Object.keys(data).map(k => `${k}: ok`).join('\n'));
}
