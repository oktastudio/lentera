import { character } from '@/systems/CharacterState';
import { questLog } from '@/systems/QuestLog';
import { worldFlags } from '@/systems/WorldFlags';

// Naikkan angka ini bila bentuk data simpanan berubah di masa depan.
export const SAVE_VERSION = 1;

export interface SaveData {
  version: number;
  savedAt: number; // milidetik sejak 1970
  character: {
    level: number;
    exp: number;
    gold: number;
    hp: number;
    mp: number;
    inventory: Array<{ itemId: string; quantity: number }>;
    equipment: Record<string, string>;
  };
  quests: { started: string[]; finished: string[] };
  world: { collectedPickups: string[]; defeatedBosses: string[] };
}

// Mengumpulkan kondisi game saat ini menjadi satu dokumen simpanan.
export function collectSave(): SaveData {
  const c = character.exportState();
  const equipment: Record<string, string> = {};
  for (const [slot, itemId] of Object.entries(c.equipment)) {
    if (itemId) equipment[slot] = itemId;
  }
  return {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    character: {
      level: c.level,
      exp: c.exp,
      gold: c.gold,
      hp: c.hp,
      mp: c.mp,
      inventory: c.inventory,
      equipment,
    },
    quests: questLog.exportState(),
    world: worldFlags.exportState(),
  };
}

// Memasang dokumen simpanan ke game. Karakter dimuat lebih dulu karena status
// quest dihitung dari isi tas.
export function applySave(data: SaveData): void {
  character.importState(data.character);
  questLog.importState(data.quests);
  worldFlags.importState(data.world);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function strings(v: unknown): string[] | null {
  return Array.isArray(v) && v.every((x) => typeof x === 'string') ? (v as string[]) : null;
}

// Memeriksa data mentah dari server. Mengembalikan null bila bentuknya salah
// atau berasal dari versi yang lebih baru dari game ini.
export function parseSave(raw: unknown): SaveData | null {
  if (!isRecord(raw)) return null;

  const version = num(raw.version);
  const savedAt = num(raw.savedAt);
  if (version === null || savedAt === null || version > SAVE_VERSION) return null;

  const c = raw.character;
  if (!isRecord(c)) return null;
  const level = num(c.level);
  const exp = num(c.exp);
  const gold = num(c.gold);
  const hp = num(c.hp);
  const mp = num(c.mp);
  if (level === null || exp === null || gold === null || hp === null || mp === null) return null;

  if (!Array.isArray(c.inventory) || !isRecord(c.equipment)) return null;
  const inventory: Array<{ itemId: string; quantity: number }> = [];
  for (const slot of c.inventory as unknown[]) {
    if (!isRecord(slot) || typeof slot.itemId !== 'string') return null;
    const quantity = num(slot.quantity);
    if (quantity === null) return null;
    inventory.push({ itemId: slot.itemId, quantity });
  }
  const equipment: Record<string, string> = {};
  for (const [k, v] of Object.entries(c.equipment)) {
    if (typeof v === 'string') equipment[k] = v;
  }

  const q = raw.quests;
  if (!isRecord(q)) return null;
  const started = strings(q.started);
  const finished = strings(q.finished);
  if (!started || !finished) return null;

  const w = raw.world;
  if (!isRecord(w)) return null;
  const collectedPickups = strings(w.collectedPickups);
  const defeatedBosses = strings(w.defeatedBosses);
  if (!collectedPickups || !defeatedBosses) return null;

  return {
    version,
    savedAt,
    character: { level, exp, gold, hp, mp, inventory, equipment },
    quests: { started, finished },
    world: { collectedPickups, defeatedBosses },
  };
}
