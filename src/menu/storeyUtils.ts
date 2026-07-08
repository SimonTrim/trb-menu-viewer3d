import type { HierarchyEntity, MenuActionContext, ObjectProperties } from '../types';

export interface StoreyInfo {
  id: number;
  name: string;
  elevation: number;
}

const STOREY_NAME_HINTS = ['étage', 'storey', 'level', 'niveau', 'floor'];
const ELEVATION_TOLERANCE = 0.05;

function batch<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function looksLikeStoreyName(name: string): boolean {
  const lower = name.toLowerCase();
  return STOREY_NAME_HINTS.some((hint) => lower.includes(hint));
}

function readElevation(props: ObjectProperties): number {
  const elevationProp = props.properties
    ?.find((set) => set.set?.includes('BuildingStorey') || set.set === 'Pset_BuildingStoreyCommon')
    ?.properties?.find((p) => p.name.toLowerCase() === 'elevation');

  if (typeof elevationProp?.value === 'number') return elevationProp.value;
  if (typeof elevationProp?.value === 'string') {
    const parsed = parseFloat(elevationProp.value);
    if (!Number.isNaN(parsed)) return parsed;
  }

  return props.position?.z ?? 0;
}

async function getPropertiesMap(
  ctx: MenuActionContext,
  modelId: string,
  runtimeIds: number[]
): Promise<Map<number, ObjectProperties>> {
  const map = new Map<number, ObjectProperties>();
  for (const chunk of batch(runtimeIds, 50)) {
    const props = await ctx.api.viewer.getObjectProperties(modelId, chunk);
    for (const prop of props) {
      map.set(prop.id, prop);
    }
  }
  return map;
}

export async function findStoreyParent(
  ctx: MenuActionContext,
  runtimeId: number
): Promise<HierarchyEntity | null> {
  const { modelId } = ctx.selection[0];
  const parents = await ctx.api.viewer.getHierarchyParents(modelId, [runtimeId], 'spatial', true);
  const flat = parents.flat();
  const parentIds = flat.map((p) => p.id);
  const propsMap = parentIds.length ? await getPropertiesMap(ctx, modelId, parentIds) : new Map();

  const storeyByClass = flat.find((p) => propsMap.get(p.id)?.class === 'IfcBuildingStorey');
  if (storeyByClass) return storeyByClass;

  return (
    flat.find((p) => looksLikeStoreyName(p.name)) ??
    flat[flat.length - 1] ??
    null
  );
}

async function findBuildingParent(
  ctx: MenuActionContext,
  runtimeId: number
): Promise<HierarchyEntity | null> {
  const { modelId } = ctx.selection[0];
  const parents = (await ctx.api.viewer.getHierarchyParents(modelId, [runtimeId], 'spatial', true)).flat();
  const propsMap = await getPropertiesMap(
    ctx,
    modelId,
    parents.map((p) => p.id)
  );

  return parents.find((p) => propsMap.get(p.id)?.class === 'IfcBuilding') ?? null;
}

async function getStoreysFromBuilding(
  ctx: MenuActionContext,
  modelId: string,
  buildingId: number
): Promise<StoreyInfo[]> {
  const children = (await ctx.api.viewer.getHierarchyChildren(modelId, [buildingId], 'spatial', false)).flat();
  if (!children.length) return [];

  const propsMap = await getPropertiesMap(
    ctx,
    modelId,
    children.map((c) => c.id)
  );

  const storeys: StoreyInfo[] = [];
  for (const child of children) {
    const props = propsMap.get(child.id);
    if (props?.class === 'IfcBuildingStorey' || looksLikeStoreyName(child.name)) {
      storeys.push({
        id: child.id,
        name: child.name,
        elevation: readElevation(props ?? { id: child.id }),
      });
    }
  }

  return storeys;
}

async function getStoreysFromFullHierarchy(
  ctx: MenuActionContext,
  modelId: string
): Promise<StoreyInfo[]> {
  const hierarchy = (await ctx.api.viewer.getHierarchyChildren(modelId, [], 'spatial', true)).flat();
  if (!hierarchy.length) return [];

  const propsMap = await getPropertiesMap(
    ctx,
    modelId,
    hierarchy.map((h) => h.id)
  );

  const storeys: StoreyInfo[] = [];
  for (const entity of hierarchy) {
    const props = propsMap.get(entity.id);
    if (props?.class === 'IfcBuildingStorey' || looksLikeStoreyName(entity.name)) {
      storeys.push({
        id: entity.id,
        name: entity.name,
        elevation: readElevation(props ?? { id: entity.id }),
      });
    }
  }

  return storeys;
}

export async function getOrderedStoreys(
  ctx: MenuActionContext,
  runtimeId: number
): Promise<StoreyInfo[]> {
  const { modelId } = ctx.selection[0];
  const building = await findBuildingParent(ctx, runtimeId);
  const storeys = building
    ? await getStoreysFromBuilding(ctx, modelId, building.id)
    : await getStoreysFromFullHierarchy(ctx, modelId);

  const unique = new Map<number, StoreyInfo>();
  for (const storey of storeys) {
    unique.set(storey.id, storey);
  }

  return [...unique.values()].sort((a, b) => a.elevation - b.elevation || a.name.localeCompare(b.name));
}

export async function getStoreyDescendantIds(
  ctx: MenuActionContext,
  modelId: string,
  storeyId: number
): Promise<number[]> {
  const children = await ctx.api.viewer.getHierarchyChildren(modelId, [storeyId], 'spatial', true);
  const ids = children.flat().map((c) => c.id);
  return [...new Set([storeyId, ...ids])];
}

export async function hideStoreys(
  ctx: MenuActionContext,
  storeys: StoreyInfo[]
): Promise<number> {
  if (!storeys.length) return 0;

  const { modelId } = ctx.selection[0];
  const allIds = new Set<number>();

  for (const storey of storeys) {
    const ids = await getStoreyDescendantIds(ctx, modelId, storey.id);
    for (const id of ids) allIds.add(id);
  }

  const objectRuntimeIds = [...allIds];
  if (!objectRuntimeIds.length) return 0;

  await ctx.api.viewer.setObjectState(
    { modelObjectIds: [{ modelId, objectRuntimeIds }] },
    { visible: false }
  );

  return objectRuntimeIds.length;
}

export function getStoreysAbove(current: StoreyInfo, storeys: StoreyInfo[]): StoreyInfo[] {
  return storeys.filter((s) => s.elevation > current.elevation + ELEVATION_TOLERANCE);
}

export function getStoreysBelow(current: StoreyInfo, storeys: StoreyInfo[]): StoreyInfo[] {
  return storeys.filter((s) => s.elevation < current.elevation - ELEVATION_TOLERANCE);
}

export async function resolveCurrentStorey(
  ctx: MenuActionContext,
  runtimeId: number
): Promise<StoreyInfo | null> {
  const entity = await findStoreyParent(ctx, runtimeId);
  if (!entity) return null;

  const { modelId } = ctx.selection[0];
  const [props] = await ctx.api.viewer.getObjectProperties(modelId, [entity.id]);
  return {
    id: entity.id,
    name: entity.name,
    elevation: readElevation(props ?? { id: entity.id }),
  };
}
