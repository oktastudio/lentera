import { ITEMS } from '@/data/items';
import { TILE_DEFS, type TileDef } from '@/world/tiles';
import type { MapData } from '@/world/types';

export type PickupReward =
  | { readonly kind: 'gold'; readonly amount: number }
  | { readonly kind: 'exp'; readonly amount: number }
  | { readonly kind: 'item'; readonly itemId: string; readonly quantity: number };

export interface MapPickup {
  readonly id: string; // unik di dalam satu peta
  readonly tileX: number;
  readonly tileY: number;
  readonly reward: PickupReward;
}

// Benda di peta, dikelompokkan per id peta.
export const PICKUPS: Readonly<Record<string, readonly MapPickup[]>> = {
  alun_alun: [
    { id: 'koin_1', tileX: 8, tileY: 5, reward: { kind: 'gold', amount: 15 } },
    {
      id: 'ramuan_1',
      tileX: 5,
      tileY: 13,
      reward: { kind: 'item', itemId: 'ramuan_langit', quantity: 1 },
    },
    { id: 'ingatan_1', tileX: 22, tileY: 6, reward: { kind: 'exp', amount: 40 } },
  ],
  gang_lampu: [
    { id: 'koin_1', tileX: 10, tileY: 6, reward: { kind: 'gold', amount: 20 } },
    {
      id: 'embun_1',
      tileX: 16,
      tileY: 4,
      reward: { kind: 'item', itemId: 'embun_ingatan', quantity: 1 },
    },
    {
      id: 'serpihan_1',
      tileX: 9,
      tileY: 12,
      reward: { kind: 'item', itemId: 'serpihan_jam', quantity: 1 },
    },
  ],
};

export function pickupsFor(mapId: string): readonly MapPickup[] {
  return (PICKUPS[mapId] as readonly MapPickup[] | undefined) ?? [];
}

// Memeriksa data benda saat peta dimuat, dengan pesan error yang jelas.
export function validatePickups(map: MapData): void {
  const errors: string[] = [];
  const seen = new Set<string>();
  const height = map.tiles.length;
  const width = height > 0 ? map.tiles[0].length : 0;

  for (const p of pickupsFor(map.id)) {
    if (seen.has(p.id)) errors.push(`id benda "${p.id}" kembar`);
    seen.add(p.id);

    if (p.tileX < 0 || p.tileY < 0 || p.tileX >= width || p.tileY >= height) {
      errors.push(`benda "${p.id}" di luar peta`);
      continue;
    }
    const def = TILE_DEFS[map.tiles[p.tileY].charAt(p.tileX)] as TileDef | undefined;
    if (def?.solid) errors.push(`benda "${p.id}" berada di atas tile padat`);

    if (p.reward.kind === 'item' && !(p.reward.itemId in ITEMS)) {
      errors.push(`benda "${p.id}" memakai item tak dikenal "${p.reward.itemId}"`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Benda di peta "${map.id}" tidak valid:\n- ${errors.join('\n- ')}`);
  }
}
