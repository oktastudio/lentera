import type { StatBlock } from '@/data/progression';

export type ItemType = 'consumable' | 'equipment' | 'material';
export type EquipSlot = 'weapon' | 'armor' | 'charm';

export interface ItemDef {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly type: ItemType;
  readonly stackable: boolean;
  readonly color: string; // warna ikon placeholder (CSS)
  readonly slot?: EquipSlot; // wajib untuk type 'equipment'
  readonly bonus?: Partial<StatBlock>; // bonus stats saat dipakai
  readonly heal?: { readonly hp?: number; readonly mp?: number };
}

export const SLOT_LABELS: Readonly<Record<EquipSlot, string>> = {
  weapon: 'Senjata',
  armor: 'Pakaian',
  charm: 'Jimat',
};

export const ITEMS: Readonly<Record<string, ItemDef>> = {
  ramuan_langit: {
    id: 'ramuan_langit',
    name: 'Ramuan Langit',
    description: 'Cairan biru dari genangan langit. Memulihkan 30 HP.',
    type: 'consumable',
    stackable: true,
    color: '#4aa3df',
    heal: { hp: 30 },
  },
  embun_ingatan: {
    id: 'embun_ingatan',
    name: 'Embun Ingatan',
    description: 'Tetes embun yang menyimpan kenangan. Memulihkan 15 MP.',
    type: 'consumable',
    stackable: true,
    color: '#b86fd1',
    heal: { mp: 15 },
  },
  serpihan_jam: {
    id: 'serpihan_jam',
    name: 'Serpihan Jam',
    description: 'Pecahan jam yang berhenti berdetak. Bahan langka.',
    type: 'material',
    stackable: true,
    color: '#ffc857',
  },
  tongkat_kenangan: {
    id: 'tongkat_kenangan',
    name: 'Tongkat Kenangan',
    description: 'Tongkat kayu yang mengingat setiap pukulan. Serangan +3.',
    type: 'equipment',
    slot: 'weapon',
    stackable: false,
    color: '#c9885a',
    bonus: { attack: 3 },
  },
  jubah_senja: {
    id: 'jubah_senja',
    name: 'Jubah Senja',
    description: 'Jubah hangat berwarna senja. Pertahanan +2, HP maks +10.',
    type: 'equipment',
    slot: 'armor',
    stackable: false,
    color: '#e0735a',
    bonus: { defense: 2, maxHp: 10 },
  },
  liontin_retak: {
    id: 'liontin_retak',
    name: 'Liontin Retak',
    description: 'Liontin dengan retakan bercahaya. MP maks +10.',
    type: 'equipment',
    slot: 'charm',
    stackable: false,
    color: '#fff3b0',
    bonus: { maxMp: 10 },
  },
};
