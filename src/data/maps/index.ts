import { ALUN_ALUN } from '@/data/maps/alunAlun';
import { GANG_LAMPU } from '@/data/maps/gangLampu';
import type { MapData } from '@/world/types';

// Daftar semua peta. Menambah peta baru = buat file datanya, tambah satu baris di sini.
const ALL_MAPS: readonly MapData[] = [ALUN_ALUN, GANG_LAMPU];

export const MAPS: Readonly<Record<string, MapData>> = Object.fromEntries(
  ALL_MAPS.map((m) => [m.id, m]),
);

export const START_MAP_ID = ALUN_ALUN.id;
export const START_SPAWN_ID = 'mulai';
