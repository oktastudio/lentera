import { BOSS_SPAWNS, BOSSES, validateBosses } from '@/data/bosses';
import { DIALOGUES, validateDialogues } from '@/data/dialogues';
import { ITEMS } from '@/data/items';
import { MAPS } from '@/data/maps';
import { MONSTER_SPAWNS, MONSTERS, validateMonsters } from '@/data/monsters';
import { NPCS, validateNpcs, type NpcDef } from '@/data/npcs';
import { PICKUPS, validatePickups } from '@/data/pickups';
import { QUESTS, validateQuests } from '@/data/quests';
import { REGIONS } from '@/data/regions';
import type { RegionTile } from '@/data/regions/types';
import { validateSkills } from '@/data/skills';
import { REGION_TILE_PAINTERS } from '@/world/regionTiles';
import { TILE_DEFS, type TileDef } from '@/world/tiles';
import { validateMap } from '@/world/validateMap';

// Memasukkan isi semua wilayah ke daftar utama game (peta, monster, NPC, dll),
// lalu memeriksa seluruh data sekaligus. Dipanggil sekali saat game dimulai,
// jadi salah ketik di data langsung terlihat, bukan baru saat peta dimasuki.

function mergeInto<T>(
  target: Readonly<Record<string, T>>,
  source: Readonly<Record<string, T>> | undefined,
  label: string,
  regionId: string,
): void {
  if (!source) return;
  const t = target as Record<string, T>;
  for (const [key, value] of Object.entries(source)) {
    if (Object.hasOwn(t, key)) {
      throw new Error(`Wilayah "${regionId}": ${label} "${key}" sudah dipakai`);
    }
    t[key] = value;
  }
}

function validateLinks(): void {
  const errors: string[] = [];
  for (const map of Object.values(MAPS)) {
    for (const exit of map.exits) {
      const target = MAPS[exit.toMap] as (typeof MAPS)[string] | undefined;
      if (!target) {
        errors.push(`peta "${map.id}": pintu menuju peta tak dikenal "${exit.toMap}"`);
      } else if (!target.spawns.some((s) => s.id === exit.toSpawn)) {
        errors.push(`peta "${map.id}": peta "${exit.toMap}" tidak punya spawn "${exit.toSpawn}"`);
      }
    }
  }
  if (errors.length > 0) {
    throw new Error(`Sambungan antar peta tidak valid:\n- ${errors.join('\n- ')}`);
  }
}

function validateAll(): void {
  for (const map of Object.values(MAPS)) {
    validateMap(map);
    validatePickups(map);
    validateNpcs(map);
    validateMonsters(map);
    validateBosses(map);
  }
  validateQuests();
  validateDialogues();
  validateSkills();
  validateLinks();
}

let installed = false;

export function installRegions(): void {
  if (installed) return;
  installed = true;

  for (const region of REGIONS) {
    const who: string = region.id;

    mergeInto(ITEMS, region.items, 'item', who);
    mergeInto(MONSTERS, region.monsters, 'monster', who);
    mergeInto(MONSTER_SPAWNS, region.monsterSpawns, 'spawn monster di peta', who);
    mergeInto(DIALOGUES, region.dialogues, 'dialog', who);
    mergeInto(QUESTS, region.quests, 'quest', who);
    mergeInto(PICKUPS, region.pickups, 'benda di peta', who);
    mergeInto(BOSSES, region.bosses, 'boss', who);
    mergeInto(BOSS_SPAWNS, region.bossSpawns, 'spawn boss di peta', who);

    const maps = Object.fromEntries((region.maps ?? []).map((m) => [m.id, m]));
    mergeInto(MAPS, maps, 'peta', who);

    const npcList = NPCS as NpcDef[];
    for (const npc of region.npcs ?? []) {
      if (npcList.some((n) => n.id === npc.id)) {
        throw new Error(`Wilayah "${who}": NPC "${npc.id}" sudah dipakai`);
      }
      npcList.push(npc);
    }

    for (const [ch, tile] of Object.entries<RegionTile>(region.tiles ?? {})) {
      if (ch.length !== 1) {
        throw new Error(`Wilayah "${who}": karakter tile "${ch}" harus satu karakter`);
      }
      if (Object.hasOwn(TILE_DEFS, ch)) {
        throw new Error(`Wilayah "${who}": karakter tile "${ch}" sudah dipakai`);
      }
      if (Object.hasOwn(REGION_TILE_PAINTERS, tile.def.key)) {
        throw new Error(`Wilayah "${who}": kunci tekstur "${tile.def.key}" sudah dipakai`);
      }
      (TILE_DEFS as Record<string, TileDef>)[ch] = tile.def;
      REGION_TILE_PAINTERS[tile.def.key] = tile.paint;
    }
  }

  validateAll();
}
