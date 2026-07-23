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
  name: 'Menu Contextuel 3D',
  version: '1.0.0',
  api: '1.0',
  extensions: [
    {
      type: 'viewerModule',
      id: 'trb-menu-viewer3d',
      title: 'Menu Contextuel 3D',
      icon: `${base}/icon-48.png`,
      url: `${base}/index.html`,
      description:
        "Menu contextuel inspiré d'EveBIM — sélection, navigation, visibilité et propriétés",
    },
  ],
  permissions: ['project.read', 'files.read', 'views.read'],
};

mkdirSync(publicDir, { recursive: true });
writeFileSync(join(publicDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`[manifest] Généré pour ${base}`);
