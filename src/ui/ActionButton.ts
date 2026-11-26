import { gameBus } from '@/systems/EventBus';
import { el } from '@/ui/dom';

// Tombol bulat di kanan bawah. Muncul hanya saat ada yang bisa diajak
// berinteraksi dan tidak sedang dalam dialog.
export class ActionButton {
  readonly root = el('button', 'action-btn');
  private prompt: string | null = null;
  private dialogueActive = false;

  constructor() {
    this.root.type = 'button';
    this.root.addEventListener('click', () => {
      gameBus.emit('interact:press', null);
    });

    gameBus.on('interact:prompt', (label) => {
      this.prompt = label;
      this.render();
    });
    gameBus.on('dialogue:show', () => {
      this.dialogueActive = true;
      this.render();
    });
    gameBus.on('dialogue:end', () => {
      this.dialogueActive = false;
      this.render();
    });
    this.render();
  }

  private render(): void {
    if (this.prompt !== null) this.root.textContent = this.prompt;
    this.root.classList.toggle('visible', this.prompt !== null && !this.dialogueActive);
  }
}
