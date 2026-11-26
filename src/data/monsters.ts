import { ITEMS } from '@/data/items';
import { TILE_DEFS, type TileDef } from '@/world/tiles';
import type { MapData } from '@/world/types';

export interface MonsterDrop {
  readonly itemId: string;
  readonly chance: number; // 0 sampai 1
  readonly quantity: number;
}

export interface MonsterDef {
  readonly id: string;
  readonly name: string;
  readonly maxHp: number;
  readonly attack: number;
  readonly defense: number;
  readonly speed: number; // piksel per detik
  readonly aggroRadius: number; // mulai mengejar bila Nara sedekat ini (piksel)
  readonly attackRange: number; // menyerang bila sedekat ini (piksel)
  readonly attackCooldownMs: number;
  readonly expReward: number;
  readonly gold: { readonly min: number; readonly max: number };
  readonly drops: readonly MonsterDrop[];
  readonly tint: number; // warna placeholder
}

export const MONSTERS: Readonly<Record<string, MonsterDef>> = {
  kecebong_langit: {
    id: 'kecebong_langit',
    name: 'Kecebong Langit',
    maxHp: 20,
    attack: 6,
    defense: 1,
    speed: 38,
    aggroRadius: 90,
    attackRange: 18,
    attackCooldownMs: 1100,
    expReward: 12,
    gold: { min: 3, max: 8 },
    drops: [{ itemId: 'ramuan_langit', chance: 0.2, quantity: 1 }],
    tint: 0x4aa3df,
  },
  bayangan_jam: {
    id: 'bayangan_jam',
    name: 'Bayangan Jam',
    maxHp: 35,
    attack: 9,
    defense: 2,
    speed: 30,
    aggroRadius: 80,
    attackRange: 18,
    attackCooldownMs: 1400,
    expReward: 25,
    gold: { min: 6, max: 14 },
    drops: [{ itemId: 'serpihan_jam', chance: 0.25, quantity: 1 }],
    tint: 0x7a3b8f,
  },
};

export interface MonsterSpawn {
  readonly id: string; // unik di dalam satu peta
  readonly monsterId: string;
  readonly tileX: number;
  readonly tileY: number;
}

export const MONSTER_SPAWNS: Readonly<Record<string, readonly MonsterSpawn[]>> = {
  alun_alun: [
    { id: 'm1', monsterId: 'kecebong_langit', tileX: 20, tileY: 12 },
    { id: 'm2', monsterId: 'kecebong_langit', tileX: 24, tileY: 11 },
    { id: 'm3', monsterId: 'kecebong_langit', tileX: 7, tileY: 16 },
  ],
  gang_lampu: [
    { id: 'm1', monsterId: 'bayangan_jam', tileX: 5, tileY: 12 },
    { id: 'm2', monsterId: 'bayangan_jam', tileX: 13, tileY: 12 },
    { id: 'm3', monsterId: 'bayangan_jam', tileX: 10, tileY: 1 },
  ],
};

export function monsterSpawnsFor(mapId: string): readonly MonsterSpawn[] {
  return (MONSTER_SPAWNS[mapId] as readonly MonsterSpawn[] | undefined) ?? [];
}

// Memeriksa data monster saat peta dimuat, dengan pesan error yang jelas.
export function validateMonsters(map: MapData): void {
  const errors: string[] = [];
  const height = map.tiles.length;
  const width = height > 0 ? map.tiles[0].length : 0;

  for (const m of Object.values(MONSTERS)) {
    if (m.maxHp <= 0) errors.push(`monster "${m.id}" HP harus > 0`);
    if (m.gold.min > m.gold.max) errors.push(`monster "${m.id}" gold min lebih besar dari max`);
    for (const d of m.drops) {
      if (!(d.itemId in ITEMS)) errors.push(`monster "${m.id}" drop item tak dikenal "${d.itemId}"`);
      if (d.chance < 0 || d.chance > 1) errors.push(`monster "${m.id}" chance drop harus 0 sampai 1`);
    }
  }

  const seen = new Set<string>();
  for (const s of monsterSpawnsFor(map.id)) {
    if (seen.has(s.id)) errors.push(`id spawn monster "${s.id}" kembar`);
    seen.add(s.id);
    if (!(s.monsterId in MONSTERS)) {
      errors.push(`spawn "${s.id}" memakai monster tak dikenal "${s.monsterId}"`);
    }
    if (s.tileX < 0 || s.tileY < 0 || s.tileX >= width || s.tileY >= height) {
      errors.push(`spawn monster "${s.id}" di luar peta`);
      continue;
    }
    const def = TILE_DEFS[map.tiles[s.tileY].charAt(s.tileX)] as TileDef | undefined;
    if (def?.solid) errors.push(`spawn monster "${s.id}" berada di atas tile padat`);
  }

  if (errors.length > 0) {
    throw new Error(`Data monster untuk peta "${map.id}" tidak valid:\n- ${errors.join('\n- ')}`);
  }
}
