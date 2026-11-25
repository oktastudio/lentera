import { gameBus } from '@/systems/EventBus';
import { el } from '@/ui/dom';

const TOAST_MS = 2300;

export class Toasts {
  readonly root = el('div', 'toast-wrap');

  constructor() {
    gameBus.on('toast', (message) => {
      this.show(message);
    });
  }

  private show(message: string): void {
    const node = el('div', 'toast', message);
    this.root.append(node);
    window.setTimeout(() => {
      node.remove();
    }, TOAST_MS);
  }
}
