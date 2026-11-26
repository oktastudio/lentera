import { DIALOGUES } from '@/data/dialogues';
import { QUESTS, type QuestStatus } from '@/data/quests';
import { TILE_DEFS, type TileDef } from '@/world/tiles';
import type { MapData } from '@/world/types';

// Aturan dipilih dari atas ke bawah; yang pertama cocok dipakai.
// Aturan tanpa "quest" selalu cocok (taruh paling bawah sebagai bawaan).
export interface DialogueRule {
  readonly quest?: { readonly id: string; readonly status: QuestStatus };
  readonly start: string; // id node dialog pertama
}

export interface NpcDef {
  readonly id: string;
  readonly name: string;
  readonly mapId: string;
  readonly tileX: number;
  readonly tileY: number;
  readonly tint: number; // warna placeholder
  readonly rules: readonly DialogueRule[];
}

export const NPCS: readonly NpcDef[] = [
  {
    id: 'pak_lampu',
    name: 'Pak Lampu',
    mapId: 'alun_alun',
    tileX: 10,
    tileY: 8,
    tint: 0xe0735a,
    rules: [
      { quest: { id: 'serpihan_penjaga', status: 'completed' }, start: 'pak_lampu_sesudah' },
      { quest: { id: 'serpihan_penjaga', status: 'ready' }, start: 'pak_lampu_selesai' },
      { quest: { id: 'serpihan_penjaga', status: 'active' }, start: 'pak_lampu_menunggu' },
      { start: 'pak_lampu_halo' },
    ],
  },
  {
    id: 'nenek_jendela',
    name: 'Nenek Jendela',
    mapId: 'gang_lampu',
    tileX: 13,
    tileY: 6,
    tint: 0x9ad7ff,
    rules: [{ start: 'nenek_halo' }],
  },
];

export function npcsFor(mapId: string): readonly NpcDef[] {
  return NPCS.filter((n) => n.mapId === mapId);
}

// Memeriksa data NPC untuk satu peta saat peta dimuat.
export function validateNpcs(map: MapData): void {
  const errors: string[] = [];
  const height = map.tiles.length;
  const width = height > 0 ? map.tiles[0].length : 0;
  const seen = new Set<string>();

  for (const n of NPCS) {
    if (seen.has(n.id)) errors.push(`id NPC "${n.id}" kembar`);
    seen.add(n.id);
    for (const r of n.rules) {
      if (!(r.start in DIALOGUES)) errors.push(`NPC "${n.id}" memakai dialog tak dikenal "${r.start}"`);
      if (r.quest && !(r.quest.id in QUESTS)) {
        errors.push(`NPC "${n.id}" memakai quest tak dikenal "${r.quest.id}"`);
      }
    }
  }

  for (const n of npcsFor(map.id)) {
    if (n.tileX < 0 || n.tileY < 0 || n.tileX >= width || n.tileY >= height) {
      errors.push(`NPC "${n.id}" di luar peta`);
      continue;
    }
    const def = TILE_DEFS[map.tiles[n.tileY].charAt(n.tileX)] as TileDef | undefined;
    if (def?.solid) errors.push(`NPC "${n.id}" berada di atas tile padat`);
  }

  if (errors.length > 0) {
    throw new Error(`Data NPC untuk peta "${map.id}" tidak valid:\n- ${errors.join('\n- ')}`);
  }
}
