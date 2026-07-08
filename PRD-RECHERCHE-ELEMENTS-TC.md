# PRD — Extension Trimble Connect Web
## Recherche et identification d'éléments BIM dans le Viewer 3D

| Champ | Valeur |
|-------|--------|
| **Produit** | Extension Viewer 3D — Recherche d'éléments |
| **Version PRD** | 1.0 |
| **Date** | 2026-07-06 |
| **Plateforme cible** | Trimble Connect for Browser (Viewer 3D) |
| **Référence UX** | EveBIM — dialogue « Recherche » |
| **Design System** | **Modus Web Components 2.0** (`@trimble-oss/moduswebcomponents`) |
| **Statut** | À développer |

---

## 1. Résumé exécutif

Développer une **extension Viewer 3D** pour Trimble Connect for Browser permettant à l'utilisateur de **rechercher des éléments IFC** par nom ou par propriétés métier, d'afficher les résultats dans une liste, puis de **les identifier visuellement dans le modèle 3D** (sélection, colorisation, masquage du reste).

Contrairement au menu contextuel sur la scène 3D (non supporté par l'API TC), ce cas d'usage est **pleinement réalisable** : l'interface vit dans le panneau latéral de l'extension ; les actions sur le viewer passent par la **Workspace API**.

---

## 2. Contexte et problème

### 2.1 Besoin client

Sur des maquettes BIM complexes (ex. bâtiments avec espaces `IfcSpace`), l'utilisateur doit pouvoir :

1. Saisir un critère de recherche (ex. `B1` dans le nom)
2. Choisir la propriété cible (Nom, Thématique, Catégorie, Type d'objet…)
3. Obtenir la liste des éléments correspondants
4. **Voir uniquement** (ou mettre en évidence) ces éléments dans le viewer 3D, colorisés (ex. rouge), le reste du modèle étant masqué ou estompé

### 2.2 Référence visuelle (EveBIM)

```
┌─ Recherche ─────────────────────┐     ┌─ Viewer 3D ──────────────┐
│ [B1          ▼ Nom] [Rechercher]│     │  Espaces trouvés en rouge │
│ ☐ sensible à la casse           │     │  Reste du modèle estompé  │
│ 19 éléments trouvés             │     │                           │
│ ┌────────┬──────────┐          │     │                           │
│ │ Nom    │ Type     │          │     │                           │
│ │ B118   │ IfcSpace │          │     │                           │
│ │ B109   │ IfcSpace │          │     │                           │
│ └────────┴──────────┘          │     │                           │
└─────────────────────────────────┘     └───────────────────────────┘
```

### 2.3 Ce qui est hors périmètre (ne pas développer)

- Menu contextuel au clic droit **sur le canvas 3D** (impossible via API TC)
- Intégration dans la barre d'outils native du viewer TC
- Modification du menu contextuel natif de Trimble Connect
- Application desktop / Trimble Connect for Windows

---

## 3. Objectifs et critères de succès

### 3.1 Objectifs (MUST)

| ID | Objectif |
|----|----------|
| O1 | Rechercher des éléments par **nom** (`product.name`, `product.objectType`) |
| O2 | Rechercher par **propriétés IFC** configurables (Property Sets) |
| O3 | Afficher les résultats dans un **tableau** paginé |
| O4 | **Coloriser** les éléments trouvés dans le viewer 3D |
| O5 | **Masquer ou isoler** les éléments non correspondants |
| O6 | **Sélectionner** un résultat → zoom / focus caméra sur l'élément |
| O7 | UI 100 % **Modus 2.0** (cohérence Trimble Connect) |
| O8 | Extension installable via **manifest.json** (Viewer 3D) |

### 3.2 Objectifs (SHOULD)

| ID | Objectif |
|----|----------|
| O9 | Option « sensible à la casse » |
| O10 | Recherche « contient » / « commence par » / « égal à » |
| O11 | Cache des propriétés pour accélérer les recherches suivantes |
| O12 | Bouton « Réinitialiser la vue » (visibilité + couleurs) |
| O13 | Support multi-modèles chargés dans le viewer |

### 3.3 Non-objectifs (WON'T — v1)

- Édition des propriétés depuis l'extension
- Export Excel / CSV des résultats
- Sauvegarde des recherches favorites
- Recherche full-text côté serveur Trimble (n'existe pas en API)

---

## 4. Personas

| Persona | Besoin |
|---------|--------|
| **Coordinateur BIM** | Identifier rapidement des espaces ou lots par code métier |
| **MOA / MOE** | Filtrer visuellement des éléments par thématique ou catégorie |
| **Contrôleur qualité** | Vérifier la présence d'éléments nommés selon une convention |

---

## 5. Parcours utilisateur

### 5.1 Parcours principal (happy path)

1. L'utilisateur ouvre un projet TC → Viewer 3D → charge un modèle IFC
2. Il active l'extension **« Recherche d'éléments »** (onglet panneau)
3. Il saisit `B1` dans le champ recherche
4. Il sélectionne la propriété **« Nom »** dans la liste déroulante
5. Il clique **Rechercher**
6. L'extension affiche « 19 éléments trouvés » et la liste (Nom, Type IFC)
7. Le viewer 3D :
   - colorise les 19 éléments en **rouge** (`#E9190F` ou couleur configurable)
   - masque ou estompe le reste (`isolateEntities` ou `setObjectState`)
8. L'utilisateur clique une ligne du tableau → la caméra zoome sur l'élément

### 5.2 Parcours secondaires

- **Aucun résultat** → message Modus Alert + toast info, pas de modification du viewer
- **Réinitialiser** → bouton secondaire remet visibilité et couleurs à l'état initial
- **Nouvelle recherche** → remplace la surbrillance précédente

---

## 6. Spécifications fonctionnelles détaillées

### 6.1 Zone de recherche (SearchBar)

| Élément | Composant Modus 2.0 | Comportement |
|---------|---------------------|--------------|
| Champ texte | `modus-wc-text-input` | Placeholder : « Rechercher… » ; déclenchement sur Entrée ou bouton |
| Sélecteur propriété | `modus-wc-select` | Options : voir §6.2 ; `options={[...]}` **jamais** `<option>` enfants |
| Bouton rechercher | `modus-wc-button` color="primary" | Icône `search` (Modus Icons) + libellé « Rechercher » |
| Sensible à la casse | `modus-wc-checkbox` | Défaut : décoché |
| Mode de correspondance | `modus-wc-select` size="sm" | `contient` (défaut), `commence_par`, `egal` |

**Propriétés recherchables (v1)** — configurer dans `src/config/searchProperties.ts` :

| ID interne | Libellé UI | Chemin de lecture |
|------------|------------|-------------------|
| `name` | Nom | `product.name` |
| `objectType` | Type d'objet | `product.objectType` |
| `ifcClass` | Type IFC | `class` |
| `idfm_thematique` | Thématique | Property Set `IDFM_IDENTIFIANT` → `THEMATIQUE` |
| `idfm_categorie` | Catégorie | Property Set `IDFM_IDENTIFIANT` → `CATEGORIE` |
| `idfm_type_objet` | Type objet | Property Set `IDFM_IDENTIFIANT` → `TYPE_OBJET` |

> Les chemins `IDFM_*` doivent être **configurables** (fichier JSON) car ils varient selon les maquettes client.

### 6.2 Résultats (ResultsTable)

| Élément | Composant Modus 2.0 | Comportement |
|---------|---------------------|--------------|
| Compteur | `modus-wc-typography` | « {n} élément(s) trouvé(s) » |
| Tableau | `modus-wc-table` | Colonnes : **Nom**, **Type IFC**, **Modèle** (si multi-modèles) |
| Pagination | `modus-wc-pagination` | 25 lignes/page par défaut |
| Ligne cliquable | `cellRenderer` | Clic → sélection + zoom caméra |
| Ligne survolée | zebra + highlight | Synchronisation optionnelle avec surbrillance 3D |
| État vide | `modus-wc-alert` variant info | « Aucun élément ne correspond à votre recherche » |
| Chargement | `modus-wc-spinner` | Pendant l'indexation / recherche |

### 6.3 Actions viewer (après recherche)

Exécuter **dans cet ordre** :

```typescript
// 1. Sélectionner tous les résultats
await api.viewer.setSelection({ modelId, objectRuntimeIds }, 'set');

// 2. Coloriser les résultats (ROUGE par défaut)
await api.viewer.setObjectState(
  { modelObjectIds: [{ modelId, objectRuntimeIds }] },
  { color: '#E9190F' }
);

// 3a. Option A — Isoler (masquer tout le reste) — RECOMMANDÉ
await api.viewer.isolateEntities([
  { modelObjectIds: [{ modelId, objectRuntimeIds }] }
]);

// 3b. Option B — Estomper le reste (opacité globale)
await api.viewer.setOpacity(15); // puis rétablir à 100 au reset
```

**Bouton « Réinitialiser »** :

```typescript
await api.viewer.setObjectState(undefined, { visible: 'reset', color: null });
await api.viewer.setOpacity(100);
await api.viewer.reset(); // optionnel — selon préférence client
```

### 6.4 Clic sur une ligne de résultat

1. `setSelection` sur l'élément unique
2. `setCamera({ modelId, objectRuntimeIds: [id] }, { animationTime: 400 })`
3. Mettre en évidence la ligne dans le tableau (état `selected`)

---

## 7. Spécifications UI — Modus 2.0 (OBLIGATOIRE)

### 7.1 Stack UI imposée

| Couche | Choix |
|--------|-------|
| Design System | **Modus Web Components 2.0** |
| Package npm | `@trimble-oss/moduswebcomponents` |
| Wrappers React | `@trimble-oss/moduswebcomponents-react` (v19 si React 19) |
| Référence locale | Dossier `modus-wc-2.0-main` (si présent dans le repo) |
| Documentation | MCP `user-modus-docs` + skills Cursor `modus-wc-*` |
| Icônes | Modus Icons (`modus-wc-icon`) — skill `modus-wc-icons-setup` |

### 7.2 Règles Modus 2.0 — NE PAS VIOLER

1. **`modus-wc-select`** : utiliser `options={[{ label, value }]}` — **jamais** `<option>` en enfants
2. **Événements formulaire** : lire via `readInputString(e)` / `readInputChecked(e)` depuis `e.detail.target` — **pas** `String(e.detail)` ni `e.detail.newValue`
3. **`modus-wc-checkbox`** : prop `value` (boolean), pas `checked`
4. **Labels** : prop `label` intégrée aux composants Modus — pas de `<label>` wrapper superflu
5. **Validation** : prop `feedback` sur les inputs, pas de `<div>` ad hoc
6. **Tables** : `modus-wc-table` avec `columns` + `data` + `cellRenderer` — pas de `<table>` HTML brut
7. **Toasts** : `modus-wc-toast` + `modus-wc-alert` dans le slot — monté à la **racine** de l'app (`position: fixed; z-index: 200`)
8. **Pas de Sonner / react-hot-toast / shadcn** — Modus uniquement
9. **Patch Shadow DOM** : appliquer `modus-blueprint-wc` une fois au démarrage (voir skill `modus-wc-nextjs` ou projet `trb-clash-BCF`)
10. **Taille des contrôles** : `size="sm"` dans le header de recherche ; `size="md"` pour le formulaire principal

### 7.3 Layout du panneau extension

```
┌─ modus-wc-card ─────────────────────────────────┐
│  modus-wc-typography (titre)                    │
│  « Recherche d'éléments »                        │
├─────────────────────────────────────────────────┤
│  [modus-wc-text-input] [modus-wc-select]        │
│  [modus-wc-button Rechercher]                   │
│  [modus-wc-checkbox] Sensible à la casse        │
├─────────────────────────────────────────────────┤
│  modus-wc-chip / typography : « 19 résultats »  │
│  ┌─ modus-wc-table ─────────────────────────┐  │
│  │ Nom      │ Type IFC  │                   │  │
│  │ B118     │ IfcSpace  │                   │  │
│  └──────────────────────────────────────────┘  │
│  modus-wc-pagination                            │
├─────────────────────────────────────────────────┤
│  [Réinitialiser]  [Isoler résultats ☐]         │
└─────────────────────────────────────────────────┘
```

Le panneau doit être **responsive** dans la largeur étroite du panneau TC (min ~280px).

### 7.4 Thème

- Respecter le thème clair par défaut (TC iframe)
- Prévoir un toggle dark mode optionnel via `modus-wc-theme-switcher` (SHOULD)
- Variables CSS Modus : importer `modus-wc-styles.css`

---

## 8. Architecture technique

### 8.1 Type d'extension

- **Type** : `viewerModule` (extension Viewer 3D)
- **Hébergement** : HTTPS (Vercel, GitHub Pages, ou serveur client)
- **Communication** : `trimble-connect-workspace-api` via `WorkspaceAPI.connect(window.parent, onEvent)`

### 8.2 Stack technique recommandée

| Couche | Technologie |
|--------|-------------|
| Framework | React 19 + TypeScript 5.7+ |
| Build | Vite 6 |
| API TC | `trimble-connect-workspace-api` ^0.3.34 |
| UI | Modus WC 2.0 (voir §7) |
| Bundle cible | < 500 KB gzip (iframe TC) |

### 8.3 Structure de projet attendue

```
trb-search-viewer3d/
├── public/
│   ├── manifest.json          # Extension Viewer 3D
│   └── icon-48.svg
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── config/
│   │   └── searchProperties.ts   # Propriétés métier configurables
│   ├── hooks/
│   │   ├── useTrimbleConnect.ts  # Connexion Workspace API
│   │   └── useToasts.ts
│   ├── services/
│   │   ├── searchService.ts      # Logique de recherche
│   │   ├── viewerActions.ts      # setObjectState, isolate, camera
│   │   └── propertyIndex.ts      # Index/cache des propriétés
│   ├── components/
│   │   ├── SearchBar.tsx
│   │   ├── ResultsTable.tsx
│   │   ├── ViewerActionsBar.tsx
│   │   └── ToastHost.tsx
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       ├── modusFormEvents.ts    # readInputString, readInputChecked
│       └── batch.ts              # Découpage par lots de 50
├── modus-wc-2.0-main/            # Référence locale Modus (optionnel)
├── index.html
├── package.json
├── vite.config.ts
└── README.md
```

### 8.4 Manifest extension

```json
{
  "url": "https://<domaine>/index.html",
  "title": "Recherche d'éléments",
  "icon": "https://<domaine>/icon-48.svg",
  "description": "Recherche et identification visuelle d'éléments BIM dans le Viewer 3D"
}
```

---

## 9. API Trimble Connect — Mapping détaillé

### 9.1 APIs utilisées

| Action | API Workspace | Notes |
|--------|---------------|-------|
| Connexion | `WorkspaceAPI.connect(window.parent, onEvent, 30000)` | Obligatoire |
| Token | `api.extension.requestPermission('accesstoken')` | Écouter `extension.accessToken` |
| Modèles chargés | `api.viewer.getModels('loaded')` | Pour parcourir les objets |
| Liste objets visibles | `api.viewer.getObjects(undefined, { visible: true })` | Point de départ indexation |
| Propriétés | `api.viewer.getObjectProperties(modelId, runtimeIds)` | **Max 50 IDs par appel** |
| Sélection | `api.viewer.setSelection({ modelId, objectRuntimeIds }, 'set')` | |
| Couleur | `api.viewer.setObjectState({ modelObjectIds: [...] }, { color })` | Format selector ! |
| Visibilité | `api.viewer.setObjectState(..., { visible: false })` | |
| Isolation | `api.viewer.isolateEntities([{ modelObjectIds: [...] }])` | |
| Caméra | `api.viewer.setCamera({ modelId, objectRuntimeIds }, { animationTime })` | |
| Reset | `api.viewer.setObjectState(undefined, { visible: 'reset', color: null })` | |
| Opacité globale | `api.viewer.setOpacity(0-100)` | Pour effet « estompé » |

### 9.2 Pièges API (CRITIQUE)

```typescript
// ❌ FAUX — setObjectState
await api.viewer.setObjectState({ modelId, objectRuntimeIds }, { color: 'red' });

// ✅ CORRECT
await api.viewer.setObjectState(
  { modelObjectIds: [{ modelId, objectRuntimeIds }] },
  { color: '#E9190F' }
);
```

- `getObjectProperties` : batch de **50** `runtimeIds` maximum
- Coordonnées viewer : **mètres** (pas millimètres comme les markups)
- Pas d'API de recherche full-text : **implémenter côté extension**

### 9.3 Événements à écouter

| Événement | Usage |
|-----------|-------|
| `viewer.modelLoaded` | Invalider / reconstruire l'index propriétés |
| `viewer.modelRemoved` | Idem |
| `viewer.selectionChanged` | Synchronisation optionnelle tableau ↔ viewer |
| `extension.accessToken` | Rafraîchissement token |

---

## 10. Algorithme de recherche

### 10.1 Phase 1 — Indexation (au chargement du modèle)

```
POUR chaque modèle chargé:
  objects = getObjects(undefined, { visible: true })
  POUR chaque lot de 50 runtimeIds:
    props = getObjectProperties(modelId, batch)
    STOCKER dans index: Map<runtimeId, ObjectProperties>
```

- Afficher `modus-wc-spinner` pendant l'indexation initiale
- Stocker en mémoire (pas localStorage — iframe tiers)
- Afficher le nombre d'objets indexés

### 10.2 Phase 2 — Requête utilisateur

```
query = texte saisi (trim)
property = propriété sélectionnée
matchMode = contient | commence_par | egal
caseSensitive = boolean

résultats = index.filter(obj => {
  valeur = resolveProperty(obj, property)
  return match(valeur, query, matchMode, caseSensitive)
})
```

### 10.3 Résolution des propriétés imbriquées

```typescript
function resolveProperty(obj: ObjectProperties, propertyId: string): string {
  switch (propertyId) {
    case 'name': return obj.product?.name ?? '';
    case 'ifcClass': return obj.class ?? '';
    case 'idfm_thematique':
      return findInPropertySets(obj, 'IDFM_IDENTIFIANT', 'THEMATIQUE');
    // ...
  }
}

function findInPropertySets(obj, setName, propName): string {
  const set = obj.properties?.find(p => p.set === setName);
  const prop = set?.properties?.find(p => p.name === propName);
  return String(prop?.value ?? '');
}
```

### 10.4 Performance — seuils

| Métrique | Cible |
|----------|-------|
| Indexation 10 000 objets | < 30 s (avec feedback progression) |
| Recherche sur index chaud | < 500 ms |
| Application couleur/isolation | < 2 s pour 500 éléments |
| Taille bundle | < 500 KB gzip |

**Optimisations** :
- Indexation lazy (au premier clic Rechercher) si modèle > 5 000 objets
- Barre de progression Modus pendant l'indexation
- Limiter la colorisation à 1 000 éléments avec avertissement au-delà

---

## 11. Modèle de données

```typescript
interface SearchQuery {
  text: string;
  propertyId: string;
  matchMode: 'contains' | 'startsWith' | 'equals';
  caseSensitive: boolean;
}

interface SearchResult {
  modelId: string;
  runtimeId: number;
  name: string;
  ifcClass: string;
  modelName?: string;
  matchedValue: string;
}

interface PropertyDefinition {
  id: string;
  label: string;
  resolver: (obj: ObjectProperties) => string;
}

interface SearchState {
  status: 'idle' | 'indexing' | 'searching' | 'highlighting' | 'error';
  progress?: number;        // 0-100 pour indexation
  results: SearchResult[];
  lastQuery?: SearchQuery;
  indexSize: number;
}
```

---

## 12. Critères d'acceptation (Definition of Done)

### 12.1 Fonctionnel

- [ ] L'extension se charge dans le panneau Viewer 3D de Trimble Connect
- [ ] Recherche par nom partiel (ex. `B1` trouve `B118`, `B109`…)
- [ ] Recherche par propriété métier configurable (`THEMATIQUE`, etc.)
- [ ] Option « sensible à la casse » fonctionnelle
- [ ] Tableau affiche Nom + Type IFC + compteur de résultats
- [ ] Clic « Rechercher » colorise les résultats en rouge dans le viewer
- [ ] Le reste du modèle est masqué (isolate) ou estompé
- [ ] Clic sur une ligne zoome sur l'élément
- [ ] Bouton « Réinitialiser » restaure visibilité et couleurs
- [ ] Message clair si 0 résultat
- [ ] Message clair si aucun modèle chargé

### 12.2 UI / Modus

- [ ] Tous les contrôles sont des composants `modus-wc-*`
- [ ] Aucun `<option>` enfant de `modus-wc-select`
- [ ] Événements `inputChange` lus via helpers `readInputString` / `readInputChecked`
- [ ] Toasts via `modus-wc-toast` + `modus-wc-alert`
- [ ] Tableau via `modus-wc-table` avec pagination
- [ ] Icônes Modus Icons correctement chargées (pas de glyphes vides)
- [ ] Interface utilisable à 280px de largeur

### 12.3 Technique

- [ ] TypeScript strict, pas d'erreurs `tsc`
- [ ] Build Vite réussi, bundle < 500 KB gzip
- [ ] manifest.json accessible en HTTPS avec CORS pour `*.connect.trimble.com`
- [ ] Gestion erreur si Workspace API ne connecte pas (mode dev local documenté)
- [ ] Pas de secrets dans le code source

---

## 13. Plan de tests

### 13.1 Tests manuels (Trimble Connect)

| # | Scénario | Résultat attendu |
|---|----------|------------------|
| T1 | Recherche `B1` sur nom, modèle avec IfcSpace | Liste + surbrillance rouge |
| T2 | Recherche sans résultat | Alert info, viewer inchangé |
| T3 | Sensible à la casse activée | Filtrage strict |
| T4 | Clic ligne résultat | Zoom caméra sur l'élément |
| T5 | Réinitialiser après recherche | Viewer restauré |
| T6 | Modèle > 5000 éléments | Indexation avec spinner, pas de freeze |
| T7 | 2 modèles chargés | Résultats des 2 modèles, colonne Modèle |
| T8 | Propriété IDFM absente du modèle | Champ vide, pas d'erreur |

### 13.2 Tests unitaires (recommandés)

- `match()` : contient, commence par, égal, casse
- `resolveProperty()` : nom, IFC class, property sets imbriqués
- `batch()` : découpage correct par 50

---

## 14. Déploiement et installation

1. `npm run build` → déployer `dist/` sur HTTPS
2. Mettre à jour `public/manifest.json` avec l'URL de production
3. Dans TC : **Paramètres → Extensions → Ajouter** → URL du manifest
4. Activer l'extension dans le Viewer 3D

### Dev local

```bash
npm install
npm run dev   # http://localhost:5173
# Manifest dev : http://localhost:5173/manifest.json
```

---

## 15. Instructions pour l'agent IA Cursor

> **Tu développes une extension Viewer 3D Trimble Connect.** Lis ce PRD en entier avant de coder.

### Ordre d'implémentation

1. **Scaffold** : Vite + React + TS + `trimble-connect-workspace-api` + Modus WC 2.0
2. **Connexion TC** : hook `useTrimbleConnect` — connexion, token, événements
3. **Setup Modus** : styles, icons, patch shadow DOM, `modusFormEvents.ts`
4. **SearchBar** : composant Modus avec tous les contrôles
5. **propertyIndex.ts** : indexation par lots de 50
6. **searchService.ts** : filtrage selon `SearchQuery`
7. **viewerActions.ts** : colorize, isolate, reset, zoom
8. **ResultsTable** : `modus-wc-table` + pagination + clic ligne
9. **Intégration** : flux complet recherche → résultats → viewer
10. **manifest.json** + README + tests manuels

### Règles impératives agent

- **TOUJOURS** utiliser Modus 2.0 — consulter les skills `modus-wc-*` et le dossier `modus-wc-2.0-main` si présent
- **JAMAIS** de menu contextuel sur le canvas 3D
- **JAMAIS** de `<table>`, `<select><option>`, ou toasts non-Modus
- **TOUJOURS** batch `getObjectProperties` par 50
- **TOUJOURS** utiliser `{ modelObjectIds: [...] }` pour `setObjectState` et `isolateEntities`
- **MINIMISER** le scope — pas de features hors PRD
- Créer une **todo list** avant de développer
- Bundle **< 500 KB** gzip

### Fichiers de référence dans l'organisation

- Documentation TC : MCP `user-trimble-connect` (tools `get_viewer_api_guide`, `search_trimble_connect_docs`)
- Projet exemple Modus + TC : `trb-clash-BCF` (patterns Modus + React)
- Skills Cursor : `modus-wc-form-inputs`, `modus-wc-table`, `modus-wc-toast`, `modus-wc-icons-setup`, `modus-wc-nextjs`

---

## 16. Risques et mitigations

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Modèle très volumineux | Indexation lente | Lazy index + progression + cache |
| Property Sets absents | Recherche métier vide | Config JSON par projet + fallback gracieux |
| Panneau étroit | UI cassée | Layout vertical, `size="sm"`, table scrollable |
| isolateEntities limite | Trop d'éléments | Avertir si > 1000 résultats ; proposer sélection partielle |
| Token expiré | API échoue | Écouter `extension.accessToken` |

---

## 17. Évolutions futures (v2+)

- Export CSV des résultats
- Recherches sauvegardées / favoris
- Filtres combinés (ET / OU)
- Colorisation par catégorie de résultats
- Intégration panneau DataTable natif TC (`api.dataTable.setConfig({ filter })`)
- Support Property Set Service (PSet API) pour propriétés éditables TC

---

## 18. Glossaire

| Terme | Définition |
|-------|------------|
| **Runtime ID** | Identifiant numérique interne du viewer pour un objet |
| **IFC Class** | Type d'entité (ex. `IfcSpace`, `IfcWall`) |
| **Property Set** | Groupe de propriétés IFC (ex. `Pset_WallCommon`, `IDFM_IDENTIFIANT`) |
| **Workspace API** | SDK officiel `trimble-connect-workspace-api` pour extensions TC |
| **Modus 2.0** | Design system Trimble — Web Components (`modus-wc-*`) |
| **isolateEntities** | API masquant tout sauf la sélection |

---

## 19. Références

- [Trimble Connect — Extend the 3D Viewer](https://developer.trimble.com/docs/connect/guides/extend/)
- [Workspace API](https://components.connect.trimble.com/trimble-connect-workspace-api/index.html)
- [Modus WC 2.0 — GitHub](https://github.com/trimble-oss/modus-wc-2.0)
- MCP Trimble Connect : `get_viewer_api_guide` (topics: selection, objectState, objects)
- MCP Modus Docs : `user-modus-docs`

---

*Fin du PRD — Version 1.0*
