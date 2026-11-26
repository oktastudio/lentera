import { gameBus } from '@/systems/EventBus';
import { questLog } from '@/systems/QuestLog';
import { el } from '@/ui/dom';

// Daftar quest yang sedang dikerjakan, di kiri bawah layar.
// Tidak menangkap sentuhan, jadi joystick tetap bisa dipakai di bawahnya.
export class QuestTracker {
  readonly root = el('div', 'quest-tracker');
  private hasQuests = false;
  private dialogueActive = false;

  constructor() {
    gameBus.on('quest:changed', () => {
      this.render();
    });
    // Kemajuan quest berubah saat isi tas berubah.
    gameBus.on('character:changed', () => {
      this.render();
    });
    gameBus.on('dialogue:show', () => {
      this.dialogueActive = true;
      this.updateVisibility();
    });
    gameBus.on('dialogue:end', () => {
      this.dialogueActive = false;
      this.updateVisibility();
    });
    this.render();
  }

  private render(): void {
    const quests = questLog.snapshot().quests.filter((q) => q.status !== 'completed');
    this.hasQuests = quests.length > 0;

    this.root.replaceChildren();
    for (const q of quests) {
      const box = el('div', 'quest-item');
      box.append(el('div', 'quest-name', q.name));
      for (const o of q.objectives) {
        const mark = o.done ? '✓' : '○';
        box.append(el('div', 'quest-obj', `${mark} ${o.label} ${o.have}/${o.need}`));
      }
      if (q.status === 'ready') {
        box.append(el('div', 'quest-ready', 'Siap dilaporkan!'));
      }
      this.root.append(box);
    }
    this.updateVisibility();
  }

  private updateVisibility(): void {
    this.root.classList.toggle('visible', this.hasQuests && !this.dialogueActive);
  }
}
