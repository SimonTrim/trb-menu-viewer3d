export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface ViewerSelection {
  modelId: string;
  objectRuntimeIds: number[];
}

export interface ObjectClickedEvent {
  modelId: string;
  objectRuntimeId: number;
  position?: Vector3;
  button?: number;
  screenX?: number;
  screenY?: number;
}

export interface ObjectProperties {
  id: number;
  class?: string;
  color?: string;
  position?: Vector3;
  product?: { name?: string; description?: string; objectType?: string };
  properties?: Array<{ set?: string; properties?: Array<{ name: string; value: string | number }> }>;
}

export interface HierarchyEntity {
  id: number;
  name: string;
  fileId: string;
}

export interface ObjectBoundingBox {
  runtimeId: number;
  min: Vector3;
  max: Vector3;
}

export interface ModelObjectIds {
  modelId: string;
  objectRuntimeIds: number[];
}

export interface MenuActionContext {
  api: TrimbleConnectAPI;
  selection: ViewerSelection[];
  targetRuntimeId?: number;
  showToast: (message: string) => void;
}

// Minimal Workspace API surface used by this extension
export interface TrimbleConnectAPI {
  viewer: {
    getSelection(): Promise<ViewerSelection[]>;
    setSelection(selector: { modelId: string; objectRuntimeIds: number[] }, mode: 'set' | 'add' | 'remove'): Promise<void>;
    getObjectProperties(modelId: string, runtimeIds: number[]): Promise<ObjectProperties[]>;
    setObjectState(
      selector: { modelObjectIds: ModelObjectIds[] } | undefined,
      state: { visible?: boolean | 'reset'; color?: string | null }
    ): Promise<void>;
    setCamera(
      target: { modelId: string; objectRuntimeIds: number[] } | { position: Vector3; target: Vector3; up: Vector3 } | 'reset',
      options?: { animationTime?: number }
    ): Promise<void>;
    setCameraMode(mode: string, spawnPoint?: Vector3): Promise<void>;
    getCamera(): Promise<{ position: Vector3; target: Vector3; up: Vector3 }>;
    getObjectBoundingBoxes(modelId: string, runtimeIds: number[]): Promise<ObjectBoundingBox[]>;
    getHierarchyParents(modelId: string, entityIds: number[], type: string, recursive: boolean, containedOnly?: boolean): Promise<HierarchyEntity[][]>;
    getHierarchyChildren(modelId: string, entityIds: number[], type: string, recursive: boolean): Promise<HierarchyEntity[][]>;
    getObjects(selector?: { selected?: boolean }, filter?: { visible?: boolean }): Promise<ModelObjectIds[]>;
    isolateEntities(selectors: Array<{ modelObjectIds: ModelObjectIds[] }>): Promise<void>;
    reset(): Promise<void>;
  };
  propertyPanel?: {
    getPropertyPanelData(): Promise<{ entities?: string[]; title?: string }>;
    openPropertySetManager?(): Promise<void>;
  };
  dataTable?: {
    setConfig(config: { show?: boolean; mode?: 'All' | 'Selected' | 'Visible' }): Promise<void>;
  };
  extension: {
    requestPermission(permission: string): Promise<string>;
    setStatusMessage(message: string): void;
    getHost(): Promise<{ name: string }>;
    requestFocus(): Promise<void>;
  };
  project: {
    getCurrentProject(): Promise<{ id: string; name: string; location: string }>;
  };
}

export interface MenuItem {
  id: string;
  label: string;
  shortcut?: string;
  separator?: boolean;
  disabled?: boolean;
  children?: MenuItem[];
  action?: (ctx: MenuActionContext) => void | Promise<void>;
}
