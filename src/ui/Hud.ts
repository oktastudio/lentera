import { character, type CharacterSnapshot } from '@/systems/CharacterState';
import { gameBus } from '@/systems/EventBus';
import { el } from '@/ui/dom';

interface BarParts {
  readonly root: HTMLDivElement;
  readonly fill: HTMLDivElement;
  readonly label: HTMLSpanElement;
}

function makeBar(kind: 'hp' | 'mp' | 'exp'): BarParts {
  const root = el('div', `bar bar-${kind}`);
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

export class Hud {
  readonly root: HTMLDivElement;
  private readonly level = el('span', 'hud-level');
  private readonly gold = el('span', 'hud-gold');
  private readonly hp = makeBar('hp');
  private readonly mp = makeBar('mp');
  private readonly exp = makeBar('exp');

  constructor(onMenu: () => void) {
    this.root = el('div', 'hud');

    const top = el('div', 'hud-top');
    top.append(this.level, this.gold);

    const menu = el('button', 'btn hud-menu', 'Tas');
    menu.type = 'button';
    menu.addEventListener('click', onMenu);

    this.root.append(top, this.hp.root, this.mp.root, this.exp.root, menu);

    gameBus.on('character:changed', (s) => {
      this.render(s);
    });
    this.render(character.snapshot());
  }

  private render(s: CharacterSnapshot): void {
    this.level.textContent = `Lv ${s.level}`;
    this.gold.textContent = `${s.gold} G`;
    setBar(this.hp, s.hp, s.stats.maxHp, `HP ${s.hp}/${s.stats.maxHp}`);
    setBar(this.mp, s.mp, s.stats.maxMp, `MP ${s.mp}/${s.stats.maxMp}`);
    if (s.expToNext === 0) {
      setBar(this.exp, 1, 1, 'EXP MAKS');
    } else {
      setBar(this.exp, s.exp, s.expToNext, `EXP ${s.exp}/${s.expToNext}`);
    }
  }
}
