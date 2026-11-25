import type { MapData } from '@/world/types';

export const GANG_LAMPU: MapData = {
  id: 'gang_lampu',
  name: 'Gang Lampu Gantung',
  region: 'kota_terbalik',
  tiles: [
    '####################',
    '#,,,,,,,,,,,,,,,,,,#',
    '#,#####,,####,####,#',
    '#,#####,,####,####,#',
    '#,,,,,,,,,,,,,,,,,,#',
    '#,,~,L,,,,L,,,,L,,,#',
    '..................D#',
    '..................D#',
    '#,,,,,,L,,,,L,,,,L,#',
    '#,,,,,,,,,,,,~~~,,,#',
    '#,####,,#####,,###,#',
    '#,####,,#####,,###,#',
    '#,,,,,,,,,,,,,,,,,,#',
    '####################',
  ],
  spawns: [{ id: 'dari_alun', tileX: 2, tileY: 6 }],
  exits: [
    {
      tileX: 0,
      tileY: 6,
      widthTiles: 1,
      heightTiles: 2,
      toMap: 'alun_alun',
      toSpawn: 'dari_gang',
    },
  ],
};
