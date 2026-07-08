export type ToastVariant = 'success' | 'info' | 'warning' | 'error';

interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
}

export class ToastHost {
  private root: HTMLElement;
  private items: ToastItem[] = [];

  constructor(rootId: string) {
    const root = document.getElementById(rootId);
    if (!root) throw new Error(`Toast host #${rootId} introuvable`);
    this.root = root;
    this.root.className = 'toast-host';
    this.root.setAttribute('aria-live', 'polite');
    this.root.setAttribute('aria-atomic', 'false');
  }

  show(message: string, variant: ToastVariant = 'info', title?: string): void {
    const id = crypto.randomUUID();
    this.items.push({
      id,
      variant,
      title: title ?? this.defaultTitle(variant),
      message: message !== title ? message : undefined,
    });
    this.render();

    window.setTimeout(() => this.dismiss(id), 4000);
  }

  private defaultTitle(variant: ToastVariant): string {
    switch (variant) {
      case 'success':
        return 'Succès';
      case 'warning':
        return 'Attention';
      case 'error':
        return 'Erreur';
      default:
        return 'Information';
    }
  }

  private dismiss(id: string): void {
    this.items = this.items.filter((item) => item.id !== id);
    this.render();
  }

  private render(): void {
    this.root.innerHTML = '';
    this.items.forEach((toast, index) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'toast-host__item';
      wrapper.style.transform = `translateY(-${index * 72}px)`;

      const toastEl = document.createElement('modus-wc-toast');
      toastEl.setAttribute('position', 'bottom-end');
      toastEl.setAttribute('delay', '4000');

      const alert = document.createElement('modus-wc-alert');
      alert.setAttribute('variant', toast.variant);
      alert.setAttribute('alert-title', toast.title);
      if (toast.message) {
        alert.textContent = toast.message;
      }

      toastEl.appendChild(alert);
      wrapper.appendChild(toastEl);
      this.root.appendChild(wrapper);
    });
  }
}
