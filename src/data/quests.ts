import { ITEMS } from '@/data/items';

// inactive = belum diambil, active = sedang dikerjakan,
// ready = syarat terpenuhi tapi belum dilapor, completed = selesai.
export type QuestStatus = 'inactive' | 'active' | 'ready' | 'completed';

export interface CollectObjective {
  readonly id: string;
  readonly label: string;
  readonly itemId: string;
  readonly amount: number;
}

export interface QuestReward {
  readonly gold?: number;
  readonly exp?: number;
  readonly items?: ReadonlyArray<{ readonly id: string; readonly qty: number }>;
}

export interface QuestDef {
  readonly id: string;
  readonly name: string;
  readonly summary: string;
  // Semua benda target diserahkan saat quest selesai.
  readonly objectives: readonly CollectObjective[];
  readonly reward: QuestReward;
}

export const QUESTS: Readonly<Record<string, QuestDef>> = {
  serpihan_penjaga: {
    id: 'serpihan_penjaga',
    name: 'Serpihan untuk Penjaga Lampu',
    summary: 'Pak Lampu butuh Serpihan Jam dan Embun Ingatan untuk menyalakan lampu yang padam.',
    objectives: [
      { id: 'serpihan', label: 'Serpihan Jam', itemId: 'serpihan_jam', amount: 1 },
      { id: 'embun', label: 'Embun Ingatan', itemId: 'embun_ingatan', amount: 1 },
    ],
    reward: {
      gold: 50,
      exp: 60,
      items: [{ id: 'ramuan_langit', qty: 2 }],
    },
  },
};

// Memeriksa data quest saat game dimuat.
export function validateQuests(): void {
  const errors: string[] = [];
  for (const q of Object.values(QUESTS)) {
    if (q.objectives.length === 0) errors.push(`quest "${q.id}" tanpa tujuan`);
    for (const o of q.objectives) {
      if (!(o.itemId in ITEMS)) errors.push(`quest "${q.id}" memakai item tak dikenal "${o.itemId}"`);
      if (o.amount <= 0) errors.push(`quest "${q.id}" tujuan "${o.id}" jumlahnya harus > 0`);
    }
    for (const r of q.reward.items ?? []) {
      if (!(r.id in ITEMS)) errors.push(`quest "${q.id}" hadiah item tak dikenal "${r.id}"`);
    }
  }
  if (errors.length > 0) {
    throw new Error(`Data quest tidak valid:\n- ${errors.join('\n- ')}`);
  }
}
