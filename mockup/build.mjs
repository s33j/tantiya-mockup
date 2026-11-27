// Builds dist/index.html: one self-contained page (fonts, styles and scripts inlined).
// No dependencies: run with `node build.mjs` (Node 18+).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = (p) => join(root, 'src', p);

// Script order matters only for top-level values; functions are looked up at run time.
const scripts = [
  'js/core.js',      // helpers, icons, odds maths
  'js/data.js',      // sample markets, bets, posts (all sample values)
  'js/state.js',     // demo state and actions shared by both frames
  'js/ui.js',        // shared building blocks (chips, outcome buttons, cards)
  'js/markets.js',   // flow 2: list, market pages, side bets
  'js/betting.js',   // flow 2: bet slip, line moved, placed, my bets, breakdown, notifications
  'js/community.js', // flow 3
  'js/signup.js',    // flow 1
  'js/wallet.js',    // flow 4
  'js/safer.js',     // flow 5
  'js/account.js',   // account tab, leaderboard, analytics (flow 7)
  'js/staff.js',     // flow 6
  'js/decisions.js', // decisions board
  'js/flows.js',     // flow map used by the start screen and presenter rail
  'js/shell.js',     // frames, routing, rendering, events
];

const fontFiles = [
  ['latin', 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'],
  ['latin-ext', 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1E00-1E9F,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF'],
];
const fonts = [];
for (const w of [400, 500, 600, 700]) {
  for (const [subset, range] of fontFiles) {
    const b64 = readFileSync(src(`fonts/ibm-plex-sans-${subset}-${w}-normal.woff2`)).toString('base64');
    fonts.push(`@font-face{font-family:'IBM Plex Sans';font-style:normal;font-weight:${w};font-display:swap;src:url(data:font/woff2;base64,${b64}) format('woff2');unicode-range:${range}}`);
  }
}

const css = fonts.join('\n') + '\n' + readFileSync(src('styles.css'), 'utf8');
const js = scripts.map((f) => `// ---- ${f}\n` + readFileSync(src(f), 'utf8')).join('\n');

let html = readFileSync(src('index.html'), 'utf8');
html = html.replace('/*__CSS__*/', () => css).replace('/*__JS__*/', () => `(() => {\n'use strict';\n${js}\n})();`);

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'index.html'), html);
console.log(`dist/index.html written (${(html.length / 1024).toFixed(0)} KB)`);
