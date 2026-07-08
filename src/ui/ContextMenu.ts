import type { MenuActionContext, MenuItem } from '../types';

export class ContextMenu {
  private root: HTMLElement;
  private items: MenuItem[];
  private getContext: () => MenuActionContext;
  private activeSubmenu: HTMLElement | null = null;
  private isOpen = false;

  constructor(container: HTMLElement, items: MenuItem[], getContext: () => MenuActionContext) {
    this.root = document.createElement('div');
    this.root.className = 'context-menu';
    this.root.setAttribute('role', 'menu');
    this.root.hidden = true;
    container.appendChild(this.root);
    this.items = items;
    this.getContext = getContext;

    document.addEventListener('click', (e) => {
      if (!this.root.contains(e.target as Node)) this.close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });
  }

  open(anchor?: { x: number; y: number }): void {
    this.renderMainMenu();
    this.root.hidden = false;
    this.isOpen = true;

    if (anchor) {
      this.root.style.position = 'fixed';
      this.root.style.left = `${anchor.x}px`;
      this.root.style.top = `${anchor.y}px`;
    } else {
      this.root.style.position = '';
      this.root.style.left = '';
      this.root.style.top = '';
    }

    requestAnimationFrame(() => this.clampToViewport());
  }

  close(): void {
    this.root.hidden = true;
    this.isOpen = false;
    this.closeSubmenu();
  }

  get opened(): boolean {
    return this.isOpen;
  }

  private clampToViewport(): void {
    const rect = this.root.getBoundingClientRect();
    const pad = 8;
    let left = rect.left;
    let top = rect.top;

    if (rect.right > window.innerWidth - pad) {
      left = window.innerWidth - rect.width - pad;
    }
    if (rect.bottom > window.innerHeight - pad) {
      top = window.innerHeight - rect.height - pad;
    }
    if (left < pad) left = pad;
    if (top < pad) top = pad;

    if (this.root.style.position === 'fixed') {
      this.root.style.left = `${left}px`;
      this.root.style.top = `${top}px`;
    }
  }

  private closeSubmenu(): void {
    this.activeSubmenu?.remove();
    this.activeSubmenu = null;
  }

  private renderMainMenu(): void {
    this.closeSubmenu();
    this.root.innerHTML = '';
    for (const item of this.items) {
      this.root.appendChild(this.createMenuItem(item, false));
    }
  }

  private createMenuItem(item: MenuItem, inSubmenu: boolean): HTMLElement {
    if (item.separator) {
      const sep = document.createElement('div');
      sep.className = 'context-menu__separator';
      sep.setAttribute('role', 'separator');
      return sep;
    }

    const el = document.createElement('div');
    el.className = 'context-menu__item';
    el.setAttribute('role', 'menuitem');
    el.tabIndex = 0;

    const label = document.createElement('span');
    label.className = 'context-menu__label';
    label.textContent = item.label;
    el.appendChild(label);

    if (item.shortcut) {
      const shortcut = document.createElement('span');
      shortcut.className = 'context-menu__shortcut';
      shortcut.textContent = item.shortcut;
      el.appendChild(shortcut);
    }

    if (item.children?.length) {
      const arrow = document.createElement('span');
      arrow.className = 'context-menu__arrow';
      arrow.textContent = '▶';
      el.appendChild(arrow);

      el.addEventListener('mouseenter', () => {
        this.showSubmenu(el, item.children!);
        el.classList.add('context-menu__item--active');
      });
      el.addEventListener('mouseleave', () => {
        el.classList.remove('context-menu__item--active');
      });
    } else if (item.action) {
      if (item.disabled) el.classList.add('context-menu__item--disabled');

      const run = () => {
        if (item.disabled) return;
        void item.action!(this.getContext());
        this.close();
      };

      el.addEventListener('click', run);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          run();
        }
      });
    }

    if (!inSubmenu && item.children?.length) {
      el.addEventListener('focus', () => this.showSubmenu(el, item.children!));
    }

    return el;
  }

  private showSubmenu(parentEl: HTMLElement, children: MenuItem[]): void {
    this.closeSubmenu();

    const submenu = document.createElement('div');
    submenu.className = 'context-menu context-menu--submenu';
    submenu.setAttribute('role', 'menu');

    for (const child of children) {
      submenu.appendChild(this.createMenuItem(child, true));
    }

    const parentRect = parentEl.getBoundingClientRect();
    const menuRect = this.root.getBoundingClientRect();

    submenu.style.position = 'fixed';
    submenu.style.left = `${menuRect.right - 2}px`;
    submenu.style.top = `${parentRect.top}px`;

    document.body.appendChild(submenu);
    this.activeSubmenu = submenu;

    requestAnimationFrame(() => {
      const subRect = submenu.getBoundingClientRect();
      if (subRect.right > window.innerWidth - 8) {
        submenu.style.left = `${menuRect.left - subRect.width + 2}px`;
      }
      if (subRect.bottom > window.innerHeight - 8) {
        submenu.style.top = `${window.innerHeight - subRect.height - 8}px`;
      }
    });
  }
}
