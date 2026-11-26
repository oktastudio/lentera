import { QUESTS } from '@/data/quests';

export type DialogueEffect =
  | { readonly kind: 'startQuest'; readonly questId: string }
  | { readonly kind: 'completeQuest'; readonly questId: string };

export interface DialogueChoice {
  readonly label: string;
  readonly next?: string; // kosong = dialog selesai
}

export interface DialogueNode {
  readonly speaker: string;
  readonly text: string;
  readonly next?: string; // lanjut otomatis ke node ini saat layar diketuk
  readonly choices?: readonly DialogueChoice[]; // tidak boleh bersamaan dengan next
  readonly effects?: readonly DialogueEffect[]; // dijalankan saat node ini tampil
}

export const DIALOGUES: Readonly<Record<string, DialogueNode>> = {
  // ---- Pak Lampu ----
  pak_lampu_halo: {
    speaker: 'Pak Lampu',
    text: 'Lentera di tanganmu... masih menyala? Lampu-lampu di kota ini padam sejak dunia lupa mana atas, mana bawah.',
    next: 'pak_lampu_tawar',
  },
  pak_lampu_tawar: {
    speaker: 'Pak Lampu',
    text: 'Maukah kau carikan Serpihan Jam dan Embun Ingatan? Dengan itu aku bisa menyalakan satu lampu lagi.',
    choices: [
      { label: 'Aku bantu', next: 'pak_lampu_terima' },
      { label: 'Nanti dulu' },
    ],
  },
  pak_lampu_terima: {
    speaker: 'Pak Lampu',
    text: 'Terima kasih, Nara. Serpihan Jam biasa jatuh di gang sempit ke arah timur. Embun menetes dekat lampu gantung.',
    effects: [{ kind: 'startQuest', questId: 'serpihan_penjaga' }],
  },
  pak_lampu_menunggu: {
    speaker: 'Pak Lampu',
    text: 'Belum ketemu? Coba telusuri Gang Lampu Gantung, lewat jalan keluar di sisi timur alun-alun.',
  },
  pak_lampu_selesai: {
    speaker: 'Pak Lampu',
    text: 'Kau menemukan keduanya! Lihat... lampunya menyala lagi, walau terbalik.',
    effects: [{ kind: 'completeQuest', questId: 'serpihan_penjaga' }],
    next: 'pak_lampu_selesai_2',
  },
  pak_lampu_selesai_2: {
    speaker: 'Pak Lampu',
    text: 'Terimalah ini. Satu lampu menyala memang belum cukup, tapi itu awal yang baik.',
  },
  pak_lampu_sesudah: {
    speaker: 'Pak Lampu',
    text: 'Cahayanya hangat, ya? Hati-hati di luar sana, Nara.',
  },

  // ---- Nenek Jendela ----
  nenek_halo: {
    speaker: 'Nenek Jendela',
    text: 'Jendelaku menghadap ke bawah, tapi pemandangannya tetap indah.',
    next: 'nenek_2',
  },
  nenek_2: {
    speaker: 'Nenek Jendela',
    text: 'Kalau tersesat, ikuti jalan ungu. Jalan selalu ingat ke mana ia menuju.',
  },
};

// Memeriksa semua tautan dialog saat game dimuat.
export function validateDialogues(): void {
  const errors: string[] = [];
  const check = (from: string, target: string | undefined): void => {
    if (target !== undefined && !(target in DIALOGUES)) {
      errors.push(`dialog "${from}" menuju node tak dikenal "${target}"`);
    }
  };

  for (const [id, node] of Object.entries(DIALOGUES)) {
    if (node.next !== undefined && node.choices !== undefined) {
      errors.push(`dialog "${id}" punya next dan choices sekaligus`);
    }
    check(id, node.next);
    for (const c of node.choices ?? []) check(id, c.next);
    for (const e of node.effects ?? []) {
      if (!(e.questId in QUESTS)) {
        errors.push(`dialog "${id}" memakai quest tak dikenal "${e.questId}"`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Data dialog tidak valid:\n- ${errors.join('\n- ')}`);
  }
}
