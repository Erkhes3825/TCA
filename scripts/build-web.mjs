// Web アプリ版をビルドする。
//   npm run build:web            → docs/
//   node scripts/build-web.mjs <出力先>
// JS と CSS を index.html に埋め込んだ 1 枚の HTML にするので、
//   ・GitHub Pages に「ブランチの docs フォルダから公開」するだけで動く（GitHub Actions 不要）
//   ・index.html をダブルクリックして直接開いても動く（オフライン可）
// 一緒に manifest・アイコン・Service Worker（public/ の中身）を置き、ホーム画面に追加・オフライン表示に対応する。
import { build } from 'vite';
import { readFileSync, writeFileSync, readdirSync, rmSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const out = resolve(process.argv[2] ?? 'docs');
const tmp = resolve('.build-web-tmp');
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

process.env.VITE_WEB = '1';
await build({ logLevel: 'warn', build: { outDir: tmp, emptyOutDir: true, cssCodeSplit: false, modulePreload: false } });

const assets = join(tmp, 'assets');
const files = readdirSync(assets);
const js = files.filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(assets, f), 'utf8')).join('\n');
const css = files.filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(assets, f), 'utf8')).join('\n');

// ビルドされた index.html の外部 JS・CSS の参照を、中身の埋め込みに差し替える
let html = readFileSync(join(tmp, 'index.html'), 'utf8')
  .replace(/\s*<script type="module"[^>]*src="[^"]*"[^>]*><\/script>/, '')
  .replace(/\s*<link rel="stylesheet"[^>]*>/, '');
// 置換文字列だと JS の中の `$&` などが特別扱いされて壊れるので、関数で渡す
html = html
  .replace('</head>', () => `  <style>${css}</style>\n  </head>`)
  .replace('</body>', () => `  <script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>\n  </body>`);

if (existsSync(out)) rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
// public/ から来たファイル（manifest・アイコン・sw.js）をそのまま写す
for (const f of readdirSync(tmp)) {
  if (f === 'assets' || f === 'index.html') continue;
  cpSync(join(tmp, f), join(out, f), { recursive: true });
}
writeFileSync(join(out, 'index.html'), html);
// 更新したら古いキャッシュを捨てるよう、Service Worker のキャッシュ名にバージョンとビルド時刻を入れる
const swPath = join(out, 'sw.js');
if (existsSync(swPath)) {
  writeFileSync(swPath, readFileSync(swPath, 'utf8').replace('__CACHE_VERSION__', () => `${pkg.version}-${Date.now()}`));
}
rmSync(tmp, { recursive: true, force: true });
console.log(`${out}/index.html (${(html.length / 1024).toFixed(0)} KB)`);
