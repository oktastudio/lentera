import type { MapData } from '@/world/types';

// Legenda: # gedung terbalik, . jalan, , tanah berwujud langit,
// ~ genangan langit, L lampu jalan terbalik, D pintu (hiasan).
export const ALUN_ALUN: MapData = {
  id: 'alun_alun',
  name: 'Alun-Alun Terbalik',
  region: 'kota_terbalik',
  tiles: [
    '##############################',
    '#,,,,,,,,,,,,,..,,,,,,,,,,,,,#',
    '#,######,,,,,,..,,,,#######,,#',
    '#,######,,,,,,..,,,,#######,,#',
    '#,##D###,,,,,,..,,,,###D###,,#',
    '#,,,,,,,,,,,,,..,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,..,,,,,,,,,,,,,#',
    '#,,,,,L,,,,,L,..,L,,,,,,L,,,,#',
    '#.............................',
    '#.............................',
    '#,,,,,,,,,,,L,..,L,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,..,,,,,,,,,,,,,#',
    '#,,~~~~~~,~~,,..,,,,,,,,,,,,,#',
    '#,,~~~~~~,~~,,..,,,,######,,,#',
    '#,,~~~~~~,,,,,..,,,,######,,,#',
    '#,,,,,,,,,,,,,..,,,,######,,,#',
    '#,,,,,,,,,,,,,..,,,,,,,,,,,,,#',
    '##############################',
  ],
  spawns: [
    { id: 'mulai', tileX: 4, tileY: 8 },
    { id: 'dari_gang', tileX: 27, tileY: 8 },
  ],
  exits: [
    {
      tileX: 29,
      tileY: 8,
      widthTiles: 1,
      heightTiles: 2,
      toMap: 'gang_lampu',
      toSpawn: 'dari_alun',
    },
  ],
};
