import * as WorkspaceAPI from 'trimble-connect-workspace-api';

import { MENU_ITEMS } from './menu/menuItems';

import { ContextMenu } from './ui/ContextMenu';

import { ToastHost } from './ui/toastHost';

import { setupModus } from './utils/modusSetup';

import type {

  ObjectClickedEvent,

  ObjectProperties,

  TrimbleConnectAPI,

  ViewerSelection,

} from './types';



setupModus();



class ContextMenuExtension {

  private api: TrimbleConnectAPI | null = null;

  private selection: ViewerSelection[] = [];

  private targetRuntimeId?: number;

  private contextMenu: ContextMenu | null = null;

  private lastPointer: { x: number; y: number } = { x: 0, y: 0 };

  private toastHost: ToastHost;



  constructor() {

    this.toastHost = new ToastHost('toast-host');

  }



  async initialize(): Promise<void> {

    this.setupPointerTracking();

    this.setupKeyboardShortcuts();

    this.setupOpenMenuButton();



    try {

      const api = (await WorkspaceAPI.connect(

        window.parent,

        this.onEvent.bind(this),

        30000

      )) as unknown as TrimbleConnectAPI;



      this.api = api;

      this.hideOfflineAlert();



      const host = await api.extension.getHost();

      if (host.name !== 'viewer3d') {

        this.showToast('Cette extension doit être utilisée dans le Viewer 3D', 'warning');

      }



      const project = await api.project.getCurrentProject();

      api.extension.setStatusMessage(`Menu contextuel — ${project.name}`);



      const token = await api.extension.requestPermission('accesstoken');

      if (token === 'denied') {

        this.showToast('Autorisation refusée', 'warning');

      }



      this.initContextMenu(this.api);

      this.selection = (await api.viewer.getSelection()) ?? [];

      await this.updateSelectionInfo();

    } catch (error) {

      console.error('[ContextMenu] Connexion Workspace API échouée:', error);

      this.renderOfflineMode();

    }

  }



  private initContextMenu(api: TrimbleConnectAPI): void {

    const root = document.getElementById('context-menu-root');

    if (!root) return;



    this.contextMenu = new ContextMenu(root, MENU_ITEMS, () => ({

      api,

      selection: this.selection,

      targetRuntimeId: this.targetRuntimeId,

      showToast: (msg) => this.showToast(msg),

    }));

  }



  private onEvent(event: string, data: unknown): void {

    switch (event) {

      case 'viewer.selectionChanged':

        void this.onSelectionChanged(data as ViewerSelection[]);

        break;

      case 'viewer.objectClicked':

        void this.onObjectClicked(data as ObjectClickedEvent);

        break;

      case 'extension.accessToken':

        break;

    }

  }



  private async onSelectionChanged(selection: ViewerSelection[]): Promise<void> {

    this.selection = selection ?? [];

    if (this.selection.length) {

      const first = this.selection[0];

      if (!this.targetRuntimeId || !first.objectRuntimeIds.includes(this.targetRuntimeId)) {

        this.targetRuntimeId = first.objectRuntimeIds[0];

      }

    }

    await this.updateSelectionInfo();

    this.updateOpenMenuButton();

  }



  private async onObjectClicked(data: ObjectClickedEvent): Promise<void> {

    if (!data?.modelId || data.objectRuntimeId == null) return;



    this.targetRuntimeId = data.objectRuntimeId;

    this.selection = [{ modelId: data.modelId, objectRuntimeIds: [data.objectRuntimeId] }];

    await this.updateSelectionInfo();



    const isRightClick = data.button === 2;

    if (isRightClick || this.wasContextMenuKey) {

      this.openContextMenu(data.screenX, data.screenY);

      this.wasContextMenuKey = false;

    }

  }



  private wasContextMenuKey = false;



  private setupOpenMenuButton(): void {

    const btn = document.getElementById('open-menu-btn');

    if (!btn) return;

    btn.addEventListener('buttonClick', () => this.openContextMenu());

    this.updateOpenMenuButton();

  }



  private updateOpenMenuButton(): void {

    const btn = document.getElementById('open-menu-btn') as (HTMLElement & { disabled?: boolean }) | null;

    if (!btn) return;

    btn.disabled = !this.selection.length;

  }



  private openContextMenu(screenX?: number, screenY?: number): void {

    this.updateOpenMenuButton();

    if (!this.contextMenu || !this.selection.length) {

      this.showToast('Sélectionnez un objet d\'abord', 'warning');

      return;

    }



    const x = screenX ?? this.lastPointer.x;

    const y = screenY ?? this.lastPointer.y;



    const anchor = screenX != null && screenY != null

      ? this.translateScreenToIframe(x, y)

      : undefined;



    this.contextMenu.open(anchor);

    void this.api?.extension.requestFocus();

  }



  private translateScreenToIframe(screenX: number, screenY: number): { x: number; y: number } {

    try {

      const frame = window.frameElement as HTMLElement | null;

      if (!frame) return { x: this.lastPointer.x, y: this.lastPointer.y };

      const rect = frame.getBoundingClientRect();

      return { x: screenX - rect.left, y: screenY - rect.top };

    } catch {

      return { x: this.lastPointer.x, y: this.lastPointer.y };

    }

  }



  private setupPointerTracking(): void {

    document.addEventListener('mousemove', (e) => {

      this.lastPointer = { x: e.clientX, y: e.clientY };

    });

    document.addEventListener('contextmenu', (e) => {

      e.preventDefault();

      if (this.selection.length) {

        this.openContextMenu(e.clientX, e.clientY);

      }

    });

  }



  private setupKeyboardShortcuts(): void {

    document.addEventListener('keydown', (e) => {

      if (e.key === 'ContextMenu' && this.selection.length) {

        e.preventDefault();

        this.wasContextMenuKey = true;

        this.openContextMenu();

      }



      if (!this.api || !this.selection.length) return;



      const ctrl = e.ctrlKey || e.metaKey;

      if (!ctrl) return;



      const key = e.key.toLowerCase();

      if (key === 'h') {

        e.preventDefault();

        void this.runShortcutAction('hide-selection');

      } else if (key === 'g') {

        e.preventDefault();

        void this.runShortcutAction('goto-fit');

      }

    });

  }



  private async runShortcutAction(itemId: string): Promise<void> {

    const findItem = (items: typeof MENU_ITEMS): (typeof MENU_ITEMS)[0] | undefined => {

      for (const item of items) {

        if (item.id === itemId) return item;

        if (item.children) {

          const found = findItem(item.children);

          if (found) return found;

        }

      }

      return undefined;

    };



    const item = findItem(MENU_ITEMS);

    if (item?.action && this.api) {

      await item.action({

        api: this.api,

        selection: this.selection,

        targetRuntimeId: this.targetRuntimeId,

        showToast: (msg) => this.showToast(msg),

      });

    }

  }



  private async updateSelectionInfo(): Promise<void> {

    const panel = document.getElementById('selection-info');

    if (!panel) return;



    if (!this.selection.length || !this.api) {

      panel.hidden = true;

      return;

    }



    panel.hidden = false;

    const { modelId, objectRuntimeIds } = this.selection[0];

    const count = this.selection.reduce((sum, s) => sum + s.objectRuntimeIds.length, 0);



    let name = '—';

    let ifcClass = '—';

    try {

      const props: ObjectProperties[] = await this.api.viewer.getObjectProperties(

        modelId,

        [this.targetRuntimeId ?? objectRuntimeIds[0]]

      );

      if (props[0]) {

        name = props[0].product?.name ?? props[0].product?.objectType ?? `ID ${props[0].id}`;

        ifcClass = props[0].class ?? '—';

      }

    } catch {

      // ignore

    }



    const countChip = document.getElementById('selection-count');

    countChip?.setAttribute('label', `${count} objet(s) sélectionné(s)`);



    const nameEl = document.getElementById('selection-name');

    nameEl?.setAttribute('label', `Nom : ${name}`);



    const typeEl = document.getElementById('selection-type');

    typeEl?.setAttribute('label', `Type IFC : ${ifcClass}`);



    this.updateOpenMenuButton();

  }



  private showToast(message: string, variant: 'success' | 'info' | 'warning' | 'error' = 'info'): void {

    this.toastHost.show(message, variant);

  }



  private hideOfflineAlert(): void {

    const alert = document.getElementById('offline-alert');

    if (alert) alert.hidden = true;

  }



  private showOfflineAlert(): void {

    const alert = document.getElementById('offline-alert');

    if (alert) alert.hidden = false;

  }



  private renderOfflineMode(): void {

    this.showOfflineAlert();

    this.api = this.createMockApi();

    this.selection = [{ modelId: 'demo', objectRuntimeIds: [1] }];

    this.targetRuntimeId = 1;

    this.initContextMenu(this.api);

    void this.updateSelectionInfo();

  }



  private createMockApi(): TrimbleConnectAPI {

    const noop = async () => undefined;

    return {

      viewer: {

        getSelection: async () => [],

        setSelection: noop,

        getObjectProperties: async () => [

          { id: 1, class: 'IfcWall', product: { name: 'Mur démo', objectType: 'Mur' } },

        ],

        setObjectState: noop,

        setCamera: noop,

        setCameraMode: noop,

        getCamera: async () => ({ position: { x: 0, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 }, up: { x: 0, y: 0, z: 1 } }),

        getObjectBoundingBoxes: async () => [],

        getHierarchyParents: async () => [],

        getHierarchyChildren: async () => [],

        getObjects: async () => [],

        isolateEntities: noop,

        reset: noop,

      },

      extension: {

        requestPermission: async () => 'denied',

        setStatusMessage: () => undefined,

        getHost: async () => ({ name: 'viewer3d' }),

        requestFocus: async () => undefined,

      },

      project: {

        getCurrentProject: async () => ({ id: '', name: 'Demo', location: 'europe' }),

      },

    };

  }

}



new ContextMenuExtension().initialize();


