import { ITEMS } from '@/data/items';
import { TILE_DEFS, type TileDef } from '@/world/tiles';
import type { MapData } from '@/world/types';

// Langkah boss. 'charge' tidak menyerang, hanya memberi aba-aba
// sebelum serangan besar berikutnya.
export type BossMove =
  | { readonly kind: 'strike'; readonly name: string; readonly power: number }
  | { readonly kind: 'charge'; readonly text: string };

export interface BossDef {
  readonly id: string;
  readonly name: string;
  readonly maxHp: number;
  readonly attack: number;
  readonly defense: number;
  readonly recommendedLevel: number;
  readonly intro: string;
  readonly pattern: readonly BossMove[]; // diulang terus selama pertarungan
  readonly tint: number; // warna placeholder di peta
  readonly reward: {
    readonly exp: number;
    readonly gold: number;
    readonly items: ReadonlyArray<{ readonly id: string; readonly qty: number }>;
  };
}

export const BOSSES: Readonly<Record<string, BossDef>> = {
  penunggu_jam: {
    id: 'penunggu_jam',
    name: 'Penunggu Jam Terbalik',
    maxHp: 90,
    attack: 12,
    defense: 3,
    recommendedLevel: 3,
    intro: 'Sosok berkepala jam menghalangi lorong. Jarum-jarumnya berputar mundur.',
    pattern: [
      { kind: 'strike', name: 'Sabetan Jarum', power: 1 },
      { kind: 'strike', name: 'Sabetan Jarum', power: 1 },
      { kind: 'charge', text: 'Penunggu Jam Terbalik memutar jarumnya makin cepat...' },
      { kind: 'strike', name: 'Dentang Waktu', power: 2 },
    ],
    tint: 0xffc857,
    reward: {
      exp: 150,
      gold: 120,
      items: [
        { id: 'ramuan_langit', qty: 2 },
        { id: 'embun_ingatan', qty: 1 },
      ],
    },
  },
};

export interface BossSpawn {
  readonly id: string; // unik di dalam satu peta
  readonly bossId: string;
  readonly tileX: number;
  readonly tileY: number;
}

export const BOSS_SPAWNS: Readonly<Record<string, readonly BossSpawn[]>> = {
  gang_lampu: [{ id: 'b1', bossId: 'penunggu_jam', tileX: 16, tileY: 6 }],
};

export function bossSpawnsFor(mapId: string): readonly BossSpawn[] {
  return (BOSS_SPAWNS[mapId] as readonly BossSpawn[] | undefined) ?? [];
}

// Memeriksa data boss saat peta dimuat, dengan pesan error yang jelas.
export function validateBosses(map: MapData): void {
  const errors: string[] = [];
  const height = map.tiles.length;
  const width = height > 0 ? map.tiles[0].length : 0;

  for (const b of Object.values(BOSSES)) {
    if (b.maxHp <= 0) errors.push(`boss "${b.id}" HP harus > 0`);
    if (b.pattern.length === 0) errors.push(`boss "${b.id}" tanpa pola serangan`);
    if (!b.pattern.some((m) => m.kind === 'strike')) {
      errors.push(`boss "${b.id}" tidak pernah menyerang (pola tanpa strike)`);
    }
    for (const it of b.reward.items) {
      if (!(it.id in ITEMS)) errors.push(`boss "${b.id}" hadiah item tak dikenal "${it.id}"`);
    }
  }

  const seen = new Set<string>();
  for (const s of bossSpawnsFor(map.id)) {
    if (seen.has(s.id)) errors.push(`id spawn boss "${s.id}" kembar`);
    seen.add(s.id);
    if (!(s.bossId in BOSSES)) errors.push(`spawn "${s.id}" memakai boss tak dikenal "${s.bossId}"`);
    if (s.tileX < 0 || s.tileY < 0 || s.tileX >= width || s.tileY >= height) {
      errors.push(`spawn boss "${s.id}" di luar peta`);
      continue;
    }
    const def = TILE_DEFS[map.tiles[s.tileY].charAt(s.tileX)] as TileDef | undefined;
    if (def?.solid) errors.push(`spawn boss "${s.id}" berada di atas tile padat`);
  }

  if (errors.length > 0) {
    throw new Error(`Data boss untuk peta "${map.id}" tidak valid:\n- ${errors.join('\n- ')}`);
  }
}
