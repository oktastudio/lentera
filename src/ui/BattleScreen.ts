import { battleManager } from '@/combat/BattleManager';
import type { BattleAction, BattleOutcome, BattleView } from '@/combat/TurnBattle';
import { gameBus } from '@/systems/EventBus';
import { el } from '@/ui/dom';

type Menu = 'main' | 'skills' | 'items';

interface BarParts {
  readonly root: HTMLDivElement;
  readonly fill: HTMLDivElement;
  readonly label: HTMLSpanElement;
}

const RESULT_TEXT: Readonly<Record<BattleOutcome, string>> = {
  victory: 'Menang!',
  defeat: 'Nara tumbang...',
  fled: 'Berhasil kabur.',
};

function makeBar(classes: string): BarParts {
  const root = el('div', classes);
  const fill = el('div', 'bar-fill');
  const label = el('span', 'bar-label');
  root.append(fill, label);
  return { root, fill, label };
}

function setBar(bar: BarParts, value: number, max: number, text: string): void {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  bar.fill.style.width = `${pct}%`;
  bar.label.textContent = text;
}

// Layar pertarungan giliran. Hanya menggambar dan meneruskan pilihan pemain
// ke battleManager; seluruh aturan pertarungan ada di folder src/combat.
export class BattleScreen {
  readonly root = el('div', 'battle-backdrop');
  private readonly enemyName = el('div', 'battle-enemy-name');
  private readonly enemyBar = makeBar('bar bar-enemy');
  private readonly log = el('div', 'battle-log');
  private readonly telegraph = el('div', 'battle-telegraph');
  private readonly result = el('div', 'battle-result');
  private readonly hp = makeBar('bar bar-hp');
  private readonly mp = makeBar('bar bar-mp');
  private readonly menuBox = el('div', 'battle-menu');
  private menu: Menu = 'main';
  private lastView: BattleView | null = null;

  constructor() {
    const panel = el('div', 'battle-panel');

    const left = el('div', 'battle-col');
    left.append(this.enemyName, this.enemyBar.root, this.log, this.telegraph);

    const right = el('div', 'battle-col');
    right.append(this.hp.root, this.mp.root, this.result, this.menuBox);

    panel.append(left, right);
    this.root.append(panel);

    gameBus.on('battle:start', (view) => {
      this.menu = 'main';
      this.root.classList.add('open');
      this.render(view);
    });
    gameBus.on('battle:update', (view) => {
      this.render(view);
    });
    gameBus.on('battle:end', () => {
      this.root.classList.remove('open');
      this.lastView = null;
    });
  }

  private render(view: BattleView): void {
    this.lastView = view;

    this.enemyName.textContent = view.enemyName;
    setBar(this.enemyBar, view.enemyHp, view.enemyMaxHp, `${view.enemyHp}/${view.enemyMaxHp}`);
    setBar(this.hp, view.playerHp, view.playerMaxHp, `HP ${view.playerHp}/${view.playerMaxHp}`);
    setBar(this.mp, view.playerMp, view.playerMaxMp, `MP ${view.playerMp}/${view.playerMaxMp}`);

    this.log.replaceChildren(...view.log.map((line) => el('div', 'battle-line', line)));
    this.log.scrollTop = this.log.scrollHeight;

    this.telegraph.textContent = view.telegraph ?? '';
    this.telegraph.classList.toggle('show', view.telegraph !== null);

    this.result.textContent = view.outcome ? RESULT_TEXT[view.outcome] : '';
    this.result.classList.toggle('show', view.outcome !== null);

    this.renderMenu(view);
  }

  private showMenu(menu: Menu): void {
    this.menu = menu;
    if (this.lastView) this.renderMenu(this.lastView);
  }

  private renderMenu(view: BattleView): void {
    const buttons: HTMLButtonElement[] = [];

    if (view.outcome) {
      const next = this.button('Lanjut', () => {
        battleManager.close();
      });
      next.classList.add('wide');
      buttons.push(next);
    } else if (this.menu === 'skills') {
      for (const s of view.skills) {
        const b = this.button(`${s.name} (${s.mpCost} MP)`, () => {
          this.act({ kind: 'skill', skillId: s.id });
        });
        b.disabled = !s.usable;
        buttons.push(b);
      }
      buttons.push(this.backButton());
    } else if (this.menu === 'items') {
      for (const it of view.items) {
        buttons.push(
          this.button(`${it.name} x${it.quantity}`, () => {
            this.act({ kind: 'item', inventoryIndex: it.index });
          }),
        );
      }
      buttons.push(this.backButton());
    } else {
      buttons.push(
        this.button('Serang', () => {
          this.act({ kind: 'attack' });
        }),
      );

      const skill = this.button('Skill', () => {
        this.showMenu('skills');
      });
      skill.disabled = view.skills.length === 0;
      buttons.push(skill);

      const item = this.button('Item', () => {
        this.showMenu('items');
      });
      item.disabled = view.items.length === 0;
      buttons.push(item);

      buttons.push(
        this.button('Bertahan', () => {
          this.act({ kind: 'defend' });
        }),
      );

      const flee = this.button('Kabur', () => {
        this.act({ kind: 'flee' });
      });
      flee.classList.add('wide');
      buttons.push(flee);
    }

    this.menuBox.replaceChildren(...buttons);
  }

  private act(action: BattleAction): void {
    this.menu = 'main';
    battleManager.act(action);
  }

  private backButton(): HTMLButtonElement {
    const back = this.button('Kembali', () => {
      this.showMenu('main');
    });
    back.classList.add('wide');
    return back;
  }

  private button(label: string, onClick: () => void): HTMLButtonElement {
    const b = el('button', 'btn', label);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  }
}
