import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'public');

function resolveBaseUrl() {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.EXTENSION_BASE_URL) {
    return process.env.EXTENSION_BASE_URL.replace(/\/$/, '');
  }
  return 'http://localhost:5173';
}

const base = resolveBaseUrl().replace(/\/$/, '');

const manifest = {
  url: `${base}/index.html`,
  title: 'Menu Contextuel 3D',
  icon: `${base}/icon-48.svg`,
  infoUrl: `${base}/index.html`,
  description:
    "Menu contextuel inspiré d'EveBIM — sélection, navigation, visibilité et propriétés",
};

mkdirSync(publicDir, { recursive: true });
writeFileSync(join(publicDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`[manifest] Généré pour ${base}`);
