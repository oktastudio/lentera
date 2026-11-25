// Angka dasar karakter. Semua balans level ada di sini, bukan di kode logika.

export interface StatBlock {
  readonly maxHp: number;
  readonly maxMp: number;
  readonly attack: number;
  readonly defense: number;
}

export const MAX_LEVEL = 30;

export const BASE_STATS: StatBlock = {
  maxHp: 50,
  maxMp: 20,
  attack: 5,
  defense: 2,
};

export const PER_LEVEL_STATS: StatBlock = {
  maxHp: 8,
  maxMp: 3,
  attack: 2,
  defense: 1,
};

// EXP yang dibutuhkan dari level ini ke level berikutnya.
export function expToNext(level: number): number {
  return 30 + level * level * 10;
}

export function baseStatsForLevel(level: number): StatBlock {
  const n = level - 1;
  return {
    maxHp: BASE_STATS.maxHp + PER_LEVEL_STATS.maxHp * n,
    maxMp: BASE_STATS.maxMp + PER_LEVEL_STATS.maxMp * n,
    attack: BASE_STATS.attack + PER_LEVEL_STATS.attack * n,
    defense: BASE_STATS.defense + PER_LEVEL_STATS.defense * n,
  };
}
