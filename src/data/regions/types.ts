import type { BossDef, BossSpawn } from '@/data/bosses';
import type { DialogueNode } from '@/data/dialogues';
import type { ItemDef } from '@/data/items';
import type { MonsterDef, MonsterSpawn } from '@/data/monsters';
import type { NpcDef } from '@/data/npcs';
import type { MapPickup } from '@/data/pickups';
import type { QuestDef } from '@/data/quests';
import type { TilePainter } from '@/world/regionTiles';
import type { TileDef } from '@/world/tiles';
import type { MapData, RegionId } from '@/world/types';

export interface RegionTile {
  readonly def: TileDef;
  readonly paint: TilePainter;
}

// Seluruh isi satu wilayah dalam satu paket. Semua bagian boleh kosong.
// Karakter tile ('tiles') harus satu huruf/simbol yang belum dipakai wilayah lain.
export interface RegionContent {
  readonly id: RegionId;
  readonly maps?: readonly MapData[];
  readonly tiles?: Readonly<Record<string, RegionTile>>;
  readonly items?: Readonly<Record<string, ItemDef>>;
  readonly monsters?: Readonly<Record<string, MonsterDef>>;
  readonly monsterSpawns?: Readonly<Record<string, readonly MonsterSpawn[]>>;
  readonly npcs?: readonly NpcDef[];
  readonly dialogues?: Readonly<Record<string, DialogueNode>>;
  readonly quests?: Readonly<Record<string, QuestDef>>;
  readonly pickups?: Readonly<Record<string, readonly MapPickup[]>>;
  readonly bosses?: Readonly<Record<string, BossDef>>;
  readonly bossSpawns?: Readonly<Record<string, readonly BossSpawn[]>>;
}
