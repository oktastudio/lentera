import { dialogue, type DialogueView } from '@/systems/DialogueRunner';
import { gameBus } from '@/systems/EventBus';
import { el } from '@/ui/dom';

// Ketukan yang datang terlalu cepat setelah teks berganti diabaikan,
// supaya ketukan ganda tidak melompati baris dialog.
const IGNORE_TAP_MS = 250;

export class DialogueBox {
  readonly root = el('div', 'dialogue-box');
  private readonly speaker = el('div', 'dialogue-speaker');
  private readonly text = el('div', 'dialogue-text');
  private readonly choices = el('div', 'dialogue-choices');
  private readonly hint = el('div', 'dialogue-hint', 'Ketuk untuk lanjut ▼');
  private hasChoices = false;
  private shownAt = 0;

  constructor() {
    this.root.append(this.speaker, this.text, this.choices, this.hint);

    this.root.addEventListener('click', () => {
      if (this.hasChoices) return;
      if (performance.now() - this.shownAt < IGNORE_TAP_MS) return;
      dialogue.advance();
    });

    gameBus.on('dialogue:show', (view) => {
      this.show(view);
    });
    gameBus.on('dialogue:end', () => {
      this.root.classList.remove('open');
    });
  }

  private show(view: DialogueView): void {
    this.shownAt = performance.now();
    this.speaker.textContent = view.speaker;
    this.text.textContent = view.text;
    this.hasChoices = view.choices.length > 0;
    this.hint.style.display = this.hasChoices ? 'none' : '';

    this.choices.replaceChildren();
    view.choices.forEach((label, index) => {
      const button = el('button', 'btn', label);
      button.type = 'button';
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        dialogue.choose(index);
      });
      this.choices.append(button);
    });

    this.root.classList.add('open');
  }
}
