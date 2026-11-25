import { TILE_DEFS, type TileDef } from '@/world/tiles';
import type { MapData } from '@/world/types';

// Memeriksa peta saat game dimuat. Kalau ada salah ketik di data,
// pesan errornya menyebut baris dan kolom yang bermasalah.
export function validateMap(map: MapData): void {
  const errors: string[] = [];
  const height = map.tiles.length;
  const width = height > 0 ? map.tiles[0].length : 0;

  if (height === 0) errors.push('tiles kosong');

  map.tiles.forEach((row, r) => {
    if (row.length !== width) {
      errors.push(`baris ${r} panjangnya ${row.length}, seharusnya ${width}`);
    }
    for (let c = 0; c < row.length; c++) {
      const ch = row.charAt(c);
      if (!(ch in TILE_DEFS)) {
        errors.push(`karakter tidak dikenal "${ch}" di baris ${r}, kolom ${c}`);
      }
    }
  });

  const inside = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < width && y < height;

  if (map.spawns.length === 0) errors.push('peta tidak punya spawn');

  for (const s of map.spawns) {
    if (!inside(s.tileX, s.tileY)) {
      errors.push(`spawn "${s.id}" di luar peta`);
      continue;
    }
    const def = TILE_DEFS[map.tiles[s.tileY].charAt(s.tileX)] as TileDef | undefined;
    if (def?.solid) errors.push(`spawn "${s.id}" berada di atas tile padat`);
  }

  for (const e of map.exits) {
    if (!inside(e.tileX, e.tileY)) {
      errors.push(`exit ke "${e.toMap}" di luar peta`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Peta "${map.id}" tidak valid:\n- ${errors.join('\n- ')}`);
  }
}
