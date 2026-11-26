import type { BossDef } from '@/data/bosses';
import { ITEMS } from '@/data/items';
import { SKILLS, type SkillDef } from '@/data/skills';
import { DEFEND_MULTIPLIER, FLEE_CHANCE, HEAVY_POWER, LOG_LINES } from '@/data/turnBased';
import { character } from '@/systems/CharacterState';
import { calculateDamage, rollChance } from '@/systems/Damage';
import { gameBus } from '@/systems/EventBus';

export type BattleAction =
  | { readonly kind: 'attack' }
  | { readonly kind: 'skill'; readonly skillId: string }
  | { readonly kind: 'item'; readonly inventoryIndex: number }
  | { readonly kind: 'defend' }
  | { readonly kind: 'flee' };

export type BattleOutcome = 'victory' | 'defeat' | 'fled';

export interface SkillOption {
  readonly id: string;
  readonly name: string;
  readonly mpCost: number;
  readonly usable: boolean;
}

export interface ItemOption {
  readonly index: number; // posisi di inventori
  readonly name: string;
  readonly quantity: number;
}

// Yang dikirim ke UI untuk digambar.
export interface BattleView {
  readonly enemyName: string;
  readonly enemyHp: number;
  readonly enemyMaxHp: number;
  readonly playerHp: number;
  readonly playerMaxHp: number;
  readonly playerMp: number;
  readonly playerMaxMp: number;
  readonly log: readonly string[];
  readonly telegraph: string | null; // peringatan serangan besar berikutnya
  readonly outcome: BattleOutcome | null;
  readonly skills: readonly SkillOption[];
  readonly items: readonly ItemOption[];
}

export interface BattleEndInfo {
  readonly outcome: BattleOutcome;
  readonly bossId: string;
}

// Satu pertarungan giliran. Giliran Nara dulu, lalu giliran boss.
// Memakai calculateDamage dan CharacterState yang sama dengan combat real-time.
export class TurnBattle {
  private enemyHp: number;
  private turn = 0;
  private outcome: BattleOutcome | null = null;
  private readonly log: string[] = [];

  constructor(private readonly boss: BossDef) {
    this.enemyHp = boss.maxHp;
    this.say(boss.intro);
    this.say(`Disarankan level ${boss.recommendedLevel} ke atas.`);
  }

  get result(): BattleEndInfo | null {
    return this.outcome ? { outcome: this.outcome, bossId: this.boss.id } : null;
  }

  act(action: BattleAction): void {
    if (this.outcome) return;
    const defending = action.kind === 'defend';

    const turnUsed = this.playerTurn(action);
    if (!turnUsed || this.outcome) {
      this.emitView();
      return;
    }

    this.enemyTurn(defending);
    this.emitView();
  }

  view(): BattleView {
    const snap = character.snapshot();

    const skills: SkillOption[] = Object.values(SKILLS)
      .filter((s) => snap.level >= s.minLevel)
      .map((s) => ({ id: s.id, name: s.name, mpCost: s.mpCost, usable: snap.mp >= s.mpCost }));

    const items: ItemOption[] = [];
    snap.inventory.forEach((slot, index) => {
      const def = ITEMS[slot.itemId];
      if (def.type === 'consumable') {
        items.push({ index, name: def.name, quantity: slot.quantity });
      }
    });

    return {
      enemyName: this.boss.name,
      enemyHp: this.enemyHp,
      enemyMaxHp: this.boss.maxHp,
      playerHp: snap.hp,
      playerMaxHp: snap.stats.maxHp,
      playerMp: snap.mp,
      playerMaxMp: snap.stats.maxMp,
      log: this.log.slice(-LOG_LINES),
      telegraph: this.outcome ? null : this.telegraph(),
      outcome: this.outcome,
      skills,
      items,
    };
  }

  // Mengembalikan true bila giliran Nara terpakai.
  private playerTurn(action: BattleAction): boolean {
    switch (action.kind) {
      case 'attack': {
        const attack = character.getStats().attack;
        this.hitEnemy(calculateDamage(attack, this.boss.defense), 'Nara menyerang');
        return true;
      }
      case 'skill': {
        const skill = SKILLS[action.skillId] as SkillDef | undefined;
        if (!skill || character.snapshot().level < skill.minLevel) {
          this.say('Skill itu belum bisa dipakai.');
          return false;
        }
        if (!character.spendMp(skill.mpCost)) {
          this.say('MP tidak cukup.');
          return false;
        }
        if (skill.kind === 'damage') {
          const attack = character.getStats().attack;
          const damage = calculateDamage(attack, this.boss.defense, skill.power ?? 1);
          this.hitEnemy(damage, `Nara memakai ${skill.name}`);
        } else {
          character.restoreHp(skill.heal ?? 0);
          this.say(`Nara memakai ${skill.name} dan memulihkan HP.`);
        }
        return true;
      }
      case 'item': {
        const slot = character.snapshot().inventory[action.inventoryIndex] as
          | { itemId: string }
          | undefined;
        if (!slot) {
          this.say('Benda itu tidak ada.');
          return false;
        }
        const name = ITEMS[slot.itemId].name;
        if (!character.useItem(action.inventoryIndex)) {
          this.say('Benda itu tidak bisa dipakai sekarang.');
          return false;
        }
        this.say(`Nara memakai ${name}.`);
        return true;
      }
      case 'defend':
        this.say('Nara bersiap menahan serangan.');
        return true;
      case 'flee':
        if (rollChance(FLEE_CHANCE)) {
          this.outcome = 'fled';
          this.say('Nara berhasil kabur!');
        } else {
          this.say('Nara gagal kabur!');
        }
        return true;
    }
  }

  private enemyTurn(defending: boolean): void {
    const move = this.boss.pattern[this.turn % this.boss.pattern.length];
    this.turn += 1;

    if (move.kind === 'charge') {
      this.say(move.text);
      return;
    }

    const defense = character.getStats().defense;
    let damage = calculateDamage(this.boss.attack, defense, move.power);
    if (defending) damage = Math.max(1, Math.floor(damage * DEFEND_MULTIPLIER));
    this.say(
      `${this.boss.name} memakai ${move.name}: ${damage} damage${defending ? ' (ditahan)' : ''}.`,
    );

    if (character.takeDamage(damage)) {
      this.outcome = 'defeat';
      this.say('Nara tumbang...');
    }
  }

  private hitEnemy(damage: number, text: string): void {
    this.enemyHp = Math.max(0, this.enemyHp - damage);
    this.say(`${text}: ${damage} damage.`);
    if (this.enemyHp === 0) this.win();
  }

  private win(): void {
    this.outcome = 'victory';
    this.say(`${this.boss.name} kalah!`);

    const r = this.boss.reward;
    const parts: string[] = [`+${r.exp} EXP`, `+${r.gold} G`];
    character.addGold(r.gold);
    for (const it of r.items) {
      if (character.addItem(it.id, it.qty)) {
        parts.push(it.qty > 1 ? `${ITEMS[it.id].name} x${it.qty}` : ITEMS[it.id].name);
      } else {
        parts.push('Inventori penuh');
      }
    }
    this.say(`Hadiah: ${parts.join(', ')}`);
    character.addExp(r.exp);
  }

  // Peringatan bila langkah boss berikutnya adalah serangan besar.
  private telegraph(): string | null {
    const next = this.boss.pattern[this.turn % this.boss.pattern.length];
    if (next.kind === 'strike' && next.power >= HEAVY_POWER) {
      return `${this.boss.name} bersiap melancarkan ${next.name}!`;
    }
    return null;
  }

  private say(line: string): void {
    this.log.push(line);
  }

  private emitView(): void {
    gameBus.emit('battle:update', this.view());
  }
}
