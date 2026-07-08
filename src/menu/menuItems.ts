import type { MenuActionContext, MenuItem, ModelObjectIds, ViewerSelection } from '../types';
import {
  findStoreyParent,
  getOrderedStoreys,
  getStoreysAbove,
  getStoreysBelow,
  hideStoreys,
  resolveCurrentStorey,
} from './storeyUtils';

function toSelector(selection: ViewerSelection[]): { modelObjectIds: ModelObjectIds[] } {
  return { modelObjectIds: selection.map((s) => ({ modelId: s.modelId, objectRuntimeIds: s.objectRuntimeIds })) };
}

function primarySelection(ctx: MenuActionContext): { modelId: string; runtimeId: number } | null {
  const first = ctx.selection[0];
  if (!first?.objectRuntimeIds.length) return null;
  const runtimeId = ctx.targetRuntimeId ?? first.objectRuntimeIds[0];
  return { modelId: first.modelId, runtimeId };
}

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'geometry',
    label: 'Géométrie',
    children: [
      {
        id: 'geo-zoom',
        label: 'Zoom sur la sélection',
        shortcut: 'Ctrl+G, Z',
        action: async (ctx) => {
          const sel = primarySelection(ctx);
          if (!sel) return;
          await ctx.api.viewer.setCamera({ modelId: sel.modelId, objectRuntimeIds: [sel.runtimeId] }, { animationTime: 400 });
          ctx.showToast('Zoom sur la sélection');
        },
      },
      {
        id: 'geo-isolate',
        label: 'Isoler la sélection',
        action: async (ctx) => {
          await ctx.api.viewer.isolateEntities([toSelector(ctx.selection)]);
          ctx.showToast('Sélection isolée');
        },
      },
      {
        id: 'geo-reset',
        label: 'Réinitialiser la vue',
        action: async (ctx) => {
          await ctx.api.viewer.reset();
          ctx.showToast('Vue réinitialisée');
        },
      },
    ],
  },
  {
    id: 'select',
    label: 'Sélectionner',
    children: [
      {
        id: 'sel-visible',
        label: 'Sélectionner les éléments visibles',
        action: async (ctx) => {
          const visible = await ctx.api.viewer.getObjects(undefined, { visible: true });
          if (!visible.length) {
            ctx.showToast('Aucun élément visible');
            return;
          }
          const total = visible.reduce((sum, group) => sum + group.objectRuntimeIds.length, 0);
          for (let i = 0; i < visible.length; i++) {
            const group = visible[i];
            await ctx.api.viewer.setSelection(
              { modelId: group.modelId, objectRuntimeIds: group.objectRuntimeIds },
              i === 0 ? 'set' : 'add'
            );
          }
          ctx.showToast(`${total} élément(s) visible(s) sélectionné(s)`);
        },
      },
      {
        id: 'sel-same-level',
        label: 'Sélectionner les éléments du même niveau',
        action: async (ctx) => {
          const sel = primarySelection(ctx);
          if (!sel) return;
          const storey = await findStoreyParent(ctx, sel.runtimeId);
          if (!storey) {
            ctx.showToast('Niveau (étage) introuvable dans la hiérarchie');
            return;
          }
          const children = await ctx.api.viewer.getHierarchyChildren(sel.modelId, [storey.id], 'spatial', true);
          const runtimeIds = children.flat().map((c) => c.id);
          if (!runtimeIds.length) {
            ctx.showToast('Aucun élément sur ce niveau');
            return;
          }
          await ctx.api.viewer.setSelection({ modelId: sel.modelId, objectRuntimeIds: runtimeIds }, 'set');
          ctx.showToast(`${runtimeIds.length} élément(s) du même niveau sélectionné(s)`);
        },
      },
      {
        id: 'sel-same-type',
        label: 'Sélectionner la fratrie ayant le même type',
        action: async (ctx) => {
          const sel = primarySelection(ctx);
          if (!sel) return;
          const [props] = await ctx.api.viewer.getObjectProperties(sel.modelId, [sel.runtimeId]);
          const objectClass = props?.class;
          if (!objectClass) {
            ctx.showToast('Type IFC introuvable');
            return;
          }
          const parents = await ctx.api.viewer.getHierarchyParents(sel.modelId, [sel.runtimeId], 'spatial', false);
          const parentId = parents.flat()[0]?.id;
          if (!parentId) {
            ctx.showToast('Parent introuvable');
            return;
          }
          const siblings = await ctx.api.viewer.getHierarchyChildren(sel.modelId, [parentId], 'spatial', false);
          const siblingIds = siblings.flat().map((s) => s.id);
          const siblingProps = await ctx.api.viewer.getObjectProperties(sel.modelId, siblingIds.slice(0, 50));
          const sameTypeIds = siblingProps.filter((p) => p.class === objectClass).map((p) => p.id);
          await ctx.api.viewer.setSelection({ modelId: sel.modelId, objectRuntimeIds: sameTypeIds }, 'set');
          ctx.showToast(`${sameTypeIds.length} élément(s) de type ${objectClass}`);
        },
      },
    ],
  },
  {
    id: 'goto',
    label: 'Aller à',
    children: [
      {
        id: 'goto-fit',
        label: 'Aller à',
        shortcut: 'Ctrl+G, Ctrl+M',
        action: async (ctx) => {
          const sel = primarySelection(ctx);
          if (!sel) return;
          await ctx.api.viewer.setCamera({ modelId: sel.modelId, objectRuntimeIds: [sel.runtimeId] }, { animationTime: 500 });
          ctx.showToast('Navigation vers l\'objet');
        },
      },
      {
        id: 'goto-teleport',
        label: 'Se téléporter vers',
        shortcut: 'Ctrl+G, Ctrl+T',
        action: async (ctx) => {
          const sel = primarySelection(ctx);
          if (!sel) return;
          const boxes = await ctx.api.viewer.getObjectBoundingBoxes(sel.modelId, [sel.runtimeId]);
          const box = boxes[0];
          if (!box) return;
          const center = {
            x: (box.min.x + box.max.x) / 2,
            y: (box.min.y + box.max.y) / 2,
            z: (box.min.z + box.max.z) / 2,
          };
          const offset = 3;
          await ctx.api.viewer.setCameraMode('walk', center);
          await ctx.api.viewer.setCamera(
            {
              position: { x: center.x + offset, y: center.y + offset, z: center.z + 1.6 },
              target: center,
              up: { x: 0, y: 0, z: 1 },
            },
            { animationTime: 300 }
          );
          ctx.showToast('Téléportation vers l\'objet');
        },
      },
    ],
  },
  {
    id: 'hide',
    label: 'Cacher',
    children: [
      {
        id: 'hide-selection',
        label: 'Cacher la sélection',
        shortcut: 'Ctrl+H, Ctrl+H',
        action: async (ctx) => {
          await ctx.api.viewer.setObjectState(toSelector(ctx.selection), { visible: false });
          ctx.showToast('Sélection masquée');
        },
      },
      {
        id: 'hide-spaces',
        label: 'Cacher tous les espaces',
        shortcut: 'Ctrl+H, Ctrl+A',
        action: async (ctx) => {
          const sel = primarySelection(ctx);
          if (!sel) return;
          const allVisible = await ctx.api.viewer.getObjects(undefined, { visible: true });
          for (const group of allVisible) {
            const props = await ctx.api.viewer.getObjectProperties(group.modelId, group.objectRuntimeIds.slice(0, 50));
            const spaceIds = props.filter((p) => p.class === 'IfcSpace').map((p) => p.id);
            if (spaceIds.length) {
              await ctx.api.viewer.setObjectState(
                { modelObjectIds: [{ modelId: group.modelId, objectRuntimeIds: spaceIds }] },
                { visible: false }
              );
            }
          }
          ctx.showToast('Espaces masqués');
        },
      },
      {
        id: 'hide-floor',
        label: 'Cacher seulement cet étage',
        shortcut: 'Ctrl+H, Ctrl+B',
        action: async (ctx) => {
          const sel = primarySelection(ctx);
          if (!sel) return;
          const storey = await findStoreyParent(ctx, sel.runtimeId);
          if (!storey) {
            ctx.showToast('Étage introuvable');
            return;
          }
          const children = await ctx.api.viewer.getHierarchyChildren(sel.modelId, [storey.id], 'spatial', true);
          const ids = children.flat().map((c) => c.id);
          await ctx.api.viewer.setObjectState(
            { modelObjectIds: [{ modelId: sel.modelId, objectRuntimeIds: ids }] },
            { visible: false }
          );
          ctx.showToast(`Étage « ${storey.name} » masqué`);
        },
      },
      {
        id: 'hide-upper',
        label: 'Cacher les étages supérieurs',
        shortcut: 'Ctrl+H, Ctrl+U',
        action: async (ctx) => {
          const sel = primarySelection(ctx);
          if (!sel) return;
          const current = await resolveCurrentStorey(ctx, sel.runtimeId);
          if (!current) {
            ctx.showToast('Étage courant introuvable');
            return;
          }
          const storeys = await getOrderedStoreys(ctx, sel.runtimeId);
          const upper = getStoreysAbove(current, storeys);
          if (!upper.length) {
            ctx.showToast('Aucun étage supérieur à masquer');
            return;
          }
          const count = await hideStoreys(ctx, upper);
          ctx.showToast(`${upper.length} étage(s) supérieur(s) masqué(s) — ${count} objet(s)`);
        },
      },
      {
        id: 'hide-lower',
        label: 'Cacher les étages inférieurs',
        shortcut: 'Ctrl+H, Ctrl+L',
        action: async (ctx) => {
          const sel = primarySelection(ctx);
          if (!sel) return;
          const current = await resolveCurrentStorey(ctx, sel.runtimeId);
          if (!current) {
            ctx.showToast('Étage courant introuvable');
            return;
          }
          const storeys = await getOrderedStoreys(ctx, sel.runtimeId);
          const lower = getStoreysBelow(current, storeys);
          if (!lower.length) {
            ctx.showToast('Aucun étage inférieur à masquer');
            return;
          }
          const count = await hideStoreys(ctx, lower);
          ctx.showToast(`${lower.length} étage(s) inférieur(s) masqué(s) — ${count} objet(s)`);
        },
      },
    ],
  },
  {
    id: 'show',
    label: 'Montrer',
    children: [
      {
        id: 'show-selection',
        label: 'Montrer la sélection',
        action: async (ctx) => {
          await ctx.api.viewer.setObjectState(toSelector(ctx.selection), { visible: true });
          ctx.showToast('Sélection affichée');
        },
      },
      {
        id: 'show-all',
        label: 'Montrer tout',
        action: async (ctx) => {
          await ctx.api.viewer.setObjectState(undefined, { visible: true });
          ctx.showToast('Tous les objets affichés');
        },
      },
      {
        id: 'show-reset',
        label: 'Réinitialiser la visibilité',
        action: async (ctx) => {
          await ctx.api.viewer.setObjectState(undefined, { visible: 'reset' });
          ctx.showToast('Visibilité réinitialisée');
        },
      },
    ],
  },
  { id: 'sep1', label: '', separator: true },
  {
    id: 'properties',
    label: 'Propriétés',
    children: [
      {
        id: 'prop-panel',
        label: 'Afficher le panneau propriétés',
        action: async (ctx) => {
          if (ctx.api.dataTable) {
            await ctx.api.dataTable.setConfig({ show: true, mode: 'Selected' });
          }
          ctx.showToast('Panneau propriétés activé');
        },
      },
      {
        id: 'prop-pset',
        label: 'Gestionnaire de Property Sets',
        action: async (ctx) => {
          await ctx.api.propertyPanel?.openPropertySetManager?.();
          ctx.showToast('Gestionnaire de Property Sets');
        },
      },
    ],
  },
  { id: 'sep2', label: '', separator: true },
  {
    id: 'copy-position',
    label: 'Copier la position',
    action: async (ctx) => {
      const sel = primarySelection(ctx);
      if (!sel) return;
      const boxes = await ctx.api.viewer.getObjectBoundingBoxes(sel.modelId, [sel.runtimeId]);
      const box = boxes[0];
      if (!box) {
        ctx.showToast('Position introuvable');
        return;
      }
      const center = {
        x: (box.min.x + box.max.x) / 2,
        y: (box.min.y + box.max.y) / 2,
        z: (box.min.z + box.max.z) / 2,
      };
      const text = `${center.x.toFixed(3)}, ${center.y.toFixed(3)}, ${center.z.toFixed(3)}`;
      await navigator.clipboard.writeText(text);
      ctx.showToast(`Position copiée : ${text}`);
    },
  },
];
