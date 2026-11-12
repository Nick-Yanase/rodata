// O Cloudflare Pages não publica pastas chamadas "node_modules", e o Expo coloca as
// fontes dos ícones em dist/assets/node_modules/... — na web os ícones viravam quadrados.
// Este script move essa pasta para dist/assets/vendor e corrige os caminhos no JS.
import { existsSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = process.argv[2] ?? 'dist';
const from = join(dist, 'assets', 'node_modules');
if (!existsSync(from)) process.exit(0);
renameSync(from, join(dist, 'assets', 'vendor'));

let changed = 0;
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(js|html|css|json)$/.test(name)) {
      const text = readFileSync(path, 'utf8');
      if (text.includes('/assets/node_modules/')) {
        writeFileSync(path, text.replaceAll('/assets/node_modules/', '/assets/vendor/'));
        changed++;
      }
    }
  }
}
walk(dist);
console.log(`fix-web-assets: assets/node_modules -> assets/vendor (${changed} arquivo(s) corrigido(s))`);
