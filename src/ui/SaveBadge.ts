import '@/ui/ui-account.css';
import type { SaveStatus } from '@/save/AutoSave';
import { gameBus } from '@/systems/EventBus';
import { el } from '@/ui/dom';

const TEXT: Readonly<Record<SaveStatus, string>> = {
  off: '',
  saving: 'Menyimpan...',
  saved: 'Tersimpan',
  error: 'Gagal menyimpan, mencoba lagi...',
};

// Tulisan kecil di kiri atas yang menunjukkan status simpanan.
export class SaveBadge {
  readonly root = el('div', 'save-badge');

  constructor() {
    gameBus.on('save:status', (status) => {
      this.root.textContent = TEXT[status];
      this.root.classList.toggle('show', status !== 'off');
      this.root.classList.toggle('error', status === 'error');
    });
  }
}
