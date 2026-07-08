# Menu Contextuel 3D — Extension Trimble Connect

Extension **Viewer 3D** pour Trimble Connect for Browser, inspirée du menu contextuel d'**EveBIM** : sélection, navigation caméra, visibilité, propriétés et copie de position.

## Fonctionnalités

| Menu | Actions |
|------|---------|
| **Géométrie** | Zoom sur sélection, isoler, réinitialiser la vue |
| **Sélectionner** | Éléments visibles, même niveau (étage), même type IFC |
| **Aller à** | Naviguer vers l'objet, téléportation (mode walk) |
| **Cacher** | Sélection, espaces, étage courant, étages supérieurs/inférieurs |
| **Montrer** | Sélection, tout afficher, réinitialiser visibilité |
| **Propriétés** | Panneau propriétés, Property Sets |
| **Copier la position** | Centre de la bounding box → presse-papiers |

## Déclenchement du menu

1. **Clic droit** sur un objet du modèle 3D (via l'événement `viewer.objectClicked`)
2. **Touche Menu** (clavier) lorsqu'un objet est sélectionné
3. **Clic droit** dans le panneau de l'extension
4. Raccourcis : `Ctrl+H` (cacher), `Ctrl+G` (aller à)

> **Note technique** : les extensions Trimble Connect s'exécutent dans un iframe latéral. Le clic droit directement sur la scène 3D dépend de l'événement `viewer.objectClicked` émis par Trimble Connect. Si le clic droit sur le modèle ne déclenche pas le menu, utilisez la touche **Menu** ou sélectionnez l'objet puis clic droit dans le panneau.

## Installation

### 1. Développement local

```bash
npm install
npm run dev
```

Le serveur démarre sur `http://localhost:5173`.

### 2. Ajouter l'extension dans Trimble Connect

1. Ouvrir un projet Trimble Connect
2. Ouvrir le **Viewer 3D** avec un modèle IFC
3. Aller dans **Paramètres → Extensions**
4. **Ajouter une extension personnalisée**
5. Coller l'URL du manifest : `http://localhost:5173/manifest.json`
6. Activer l'extension **Menu Contextuel 3D**

### 3. Production (Vercel)

**URL manifest production :** `https://trb-menu-viewer3d.vercel.app/manifest.json`

1. Ouvrir un projet Trimble Connect → **Viewer 3D**
2. **Paramètres → Extensions → Ajouter une extension personnalisée**
3. Coller l'URL du manifest : `https://trb-menu-viewer3d.vercel.app/manifest.json`
4. Activer l'extension **Menu Contextuel 3D**

Le manifest est généré automatiquement au build via `scripts/generate-manifest.mjs` (variable `VERCEL_URL` sur Vercel, `localhost` en local).

```bash
npm run build    # génère manifest + compile dans dist/
```

Déploiement : repo GitHub [`trb-menu-viewer3d`](https://github.com/SimonTrim/trb-menu-viewer3d) lié à Vercel.
## UI — Modus Web Components 2.0

L'interface du panneau utilise **Modus WC 2.0** (`@trimble-oss/moduswebcomponents`) :
- `modus-wc-card`, `modus-wc-typography`, `modus-wc-button`, `modus-wc-chip`
- `modus-wc-alert`, `modus-wc-toast`, `modus-wc-icon`
- Le menu contextuel hiérarchique conserve une structure EveBIM avec les **tokens couleur Modus**

## Structure du projet

```
trb-menu-viewer3D/
├── public/
│   ├── manifest.json      # Manifest extension Viewer 3D
│   └── icon-48.svg
├── src/
│   ├── index.ts           # Point d'entrée, connexion Workspace API
│   ├── types.ts
│   ├── menu/
│   │   ├── menuItems.ts   # Définition du menu et actions
│   │   └── storeyUtils.ts # Hiérarchie IFC des étages
│   ├── utils/
│   │   └── modusSetup.ts  # Enregistrement des Web Components Modus
│   └── ui/
│       ├── ContextMenu.ts # Composant menu hiérarchique
│       └── styles.css     # Style inspiré EveBIM
├── index.html
├── package.json
└── vite.config.ts
```

## API Trimble Connect utilisées

- `viewer.getSelection` / `setSelection`
- `viewer.getObjectProperties`
- `viewer.setObjectState` (visibilité)
- `viewer.setCamera` / `setCameraMode`
- `viewer.getHierarchyParents` / `getHierarchyChildren`
- `viewer.getObjectBoundingBoxes`
- `viewer.isolateEntities`
- `dataTable.setConfig` / `propertyPanel`

## Licence

MIT
