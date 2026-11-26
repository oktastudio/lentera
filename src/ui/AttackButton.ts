import { gameBus } from '@/systems/EventBus';
import { el } from '@/ui/dom';

// Tombol serang besar di kanan bawah. Memakai pointerdown (bukan click)
// supaya respons terasa langsung dan bisa dipakai bersamaan dengan joystick.
export class AttackButton {
  readonly root = el('button', 'attack-btn', 'Serang');

  constructor() {
    this.root.type = 'button';
    this.root.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      gameBus.emit('attack:press', null);
    });
    // Mencegah menu tekan-lama bawaan Android muncul di atas tombol.
    this.root.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    gameBus.on('dialogue:show', () => {
      this.root.classList.add('hidden');
    });
    gameBus.on('dialogue:end', () => {
      this.root.classList.remove('hidden');
    });
  }
}
