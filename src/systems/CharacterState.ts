import { ITEMS, type EquipSlot, type ItemDef } from '@/data/items';
import {
  MAX_LEVEL,
  baseStatsForLevel,
  expToNext,
  type StatBlock,
} from '@/data/progression';
import { gameBus } from '@/systems/EventBus';

export const INVENTORY_CAPACITY = 20;

export interface InventorySlot {
  readonly itemId: string;
  quantity: number;
}

export type Equipment = Partial<Record<EquipSlot, string>>;

export interface CharacterSnapshot {
  readonly level: number;
  readonly exp: number;
  readonly expToNext: number; // 0 bila sudah level maksimum
  readonly gold: number;
  readonly hp: number;
  readonly mp: number;
  readonly stats: StatBlock;
  readonly inventory: readonly InventorySlot[];
  readonly equipment: Readonly<Equipment>;
}

// Satu-satunya sumber kebenaran data Nara. Dipakai oleh semua mode combat nanti.
class CharacterState {
  private level = 1;
  private exp = 0;
  private gold = 0;
  private hp: number;
  private mp: number;
  private readonly inventory: InventorySlot[] = [];
  private readonly equipment: Equipment = {};

  constructor() {
    const stats = this.getStats();
    this.hp = stats.maxHp;
    this.mp = stats.maxMp;
  }

  getStats(): StatBlock {
    const base = baseStatsForLevel(this.level);
    let { maxHp, maxMp, attack, defense } = base;
    for (const itemId of Object.values(this.equipment)) {
      if (!itemId) continue;
      const def = ITEMS[itemId] as ItemDef | undefined;
      const bonus = def?.bonus;
      if (!bonus) continue;
      maxHp += bonus.maxHp ?? 0;
      maxMp += bonus.maxMp ?? 0;
      attack += bonus.attack ?? 0;
      defense += bonus.defense ?? 0;
    }
    return { maxHp, maxMp, attack, defense };
  }

  snapshot(): CharacterSnapshot {
    return {
      level: this.level,
      exp: this.exp,
      expToNext: this.level >= MAX_LEVEL ? 0 : expToNext(this.level),
      gold: this.gold,
      hp: this.hp,
      mp: this.mp,
      stats: this.getStats(),
      inventory: this.inventory.map((s) => ({ ...s })),
      equipment: { ...this.equipment },
    };
  }

  addExp(amount: number): void {
    if (amount <= 0 || this.level >= MAX_LEVEL) return;
    this.exp += amount;
    let leveled = false;
    while (this.level < MAX_LEVEL && this.exp >= expToNext(this.level)) {
      this.exp -= expToNext(this.level);
      this.level += 1;
      leveled = true;
    }
    if (this.level >= MAX_LEVEL) this.exp = 0;
    if (leveled) {
      const stats = this.getStats();
      this.hp = stats.maxHp;
      this.mp = stats.maxMp;
      gameBus.emit('toast', `Naik ke level ${this.level}!`);
    }
    this.changed();
  }

  addGold(amount: number): void {
    if (amount <= 0) return;
    this.gold += amount;
    this.changed();
  }

  // Mengembalikan false bila item tidak dikenal atau inventori penuh.
  addItem(itemId: string, quantity = 1): boolean {
    const def = ITEMS[itemId] as ItemDef | undefined;
    if (!def || quantity <= 0) return false;

    if (def.stackable) {
      const existing = this.inventory.find((s) => s.itemId === itemId);
      if (existing) {
        existing.quantity += quantity;
        this.changed();
        return true;
      }
      if (this.inventory.length >= INVENTORY_CAPACITY) return false;
      this.inventory.push({ itemId, quantity });
      this.changed();
      return true;
    }

    if (this.inventory.length + quantity > INVENTORY_CAPACITY) return false;
    for (let i = 0; i < quantity; i++) this.inventory.push({ itemId, quantity: 1 });
    this.changed();
    return true;
  }
  // Mengembalikan true bila HP Nara habis setelah serangan ini.
  takeDamage(amount: number): boolean {
    if (this.hp <= 0) return true;
    if (amount <= 0) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.changed();
    return this.hp <= 0;
  }

  // Dipanggil setelah kalah: HP dan MP pulih penuh, sebagian gold hilang.
  // Mengembalikan jumlah gold yang hilang.
  reviveAfterDefeat(goldPenaltyRatio: number): number {
    const stats = this.getStats();
    this.hp = stats.maxHp;
    this.mp = stats.maxMp;
    const lost = Math.floor(this.gold * goldPenaltyRatio);
    this.gold -= lost;
    this.changed();
    return lost;
  }
  // Mengembalikan false (tanpa mengubah apa pun) bila MP tidak cukup.
  spendMp(amount: number): boolean {
    if (amount < 0 || this.mp < amount) return false;
    this.mp -= amount;
    this.changed();
    return true;
  }

  restoreHp(amount: number): void {
    if (amount <= 0) return;
    this.hp = Math.min(this.getStats().maxHp, this.hp + amount);
    this.changed();
  }
  
  countItem(itemId: string): number {
    let total = 0;
    for (const s of this.inventory) {
      if (s.itemId === itemId) total += s.quantity;
    }
    return total;
  }

  // Mengembalikan false (tanpa mengubah apa pun) bila jumlahnya tidak cukup.
  removeItem(itemId: string, quantity = 1): boolean {
    if (quantity <= 0 || this.countItem(itemId) < quantity) return false;
    let left = quantity;
    for (let i = this.inventory.length - 1; i >= 0 && left > 0; i--) {
      const slot = this.inventory[i];
      if (slot.itemId !== itemId) continue;
      const take = Math.min(slot.quantity, left);
      slot.quantity -= take;
      left -= take;
      if (slot.quantity <= 0) this.inventory.splice(i, 1);
    }
    this.changed();
    return true;
  }
  
  useItem(index: number): boolean {
    const slot = this.inventory[index] as InventorySlot | undefined;
    if (!slot) return false;
    const def = ITEMS[slot.itemId];
    if (def.type !== 'consumable' || !def.heal) return false;

    const stats = this.getStats();
    this.hp = Math.min(stats.maxHp, this.hp + (def.heal.hp ?? 0));
    this.mp = Math.min(stats.maxMp, this.mp + (def.heal.mp ?? 0));
    this.consumeOne(index);
    gameBus.emit('toast', `Memakai ${def.name}`);
    this.changed();
    return true;
  }

  equipFromInventory(index: number): boolean {
    const slot = this.inventory[index] as InventorySlot | undefined;
    if (!slot) return false;
    const def = ITEMS[slot.itemId];
    if (def.type !== 'equipment' || !def.slot) return false;

    this.consumeOne(index);
    const previous = this.equipment[def.slot];
    this.equipment[def.slot] = def.id;
    if (previous) this.inventory.push({ itemId: previous, quantity: 1 });
    this.clampVitals();
    gameBus.emit('toast', `Memakai ${def.name}`);
    this.changed();
    return true;
  }

  unequip(slotName: EquipSlot): boolean {
    const itemId = this.equipment[slotName];
    if (!itemId) return false;
    if (this.inventory.length >= INVENTORY_CAPACITY) {
      gameBus.emit('toast', 'Inventori penuh');
      return false;
    }
    delete this.equipment[slotName];
    this.inventory.push({ itemId, quantity: 1 });
    this.clampVitals();
    this.changed();
    return true;
  }

  private consumeOne(index: number): void {
    const slot = this.inventory[index];
    slot.quantity -= 1;
    if (slot.quantity <= 0) this.inventory.splice(index, 1);
  }

  private clampVitals(): void {
    const stats = this.getStats();
    this.hp = Math.min(this.hp, stats.maxHp);
    this.mp = Math.min(this.mp, stats.maxMp);
  }

  private changed(): void {
    gameBus.emit('character:changed', this.snapshot());
  }
}

export const character = new CharacterState();
