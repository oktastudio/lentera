export type SkillKind = 'damage' | 'heal';

export interface SkillDef {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly kind: SkillKind;
  readonly mpCost: number;
  readonly minLevel: number; // level yang dibutuhkan untuk membuka skill
  readonly power?: number; // pengali serangan (untuk kind 'damage')
  readonly heal?: number; // HP yang dipulihkan (untuk kind 'heal')
}

export const SKILLS: Readonly<Record<string, SkillDef>> = {
  cahaya_lentera: {
    id: 'cahaya_lentera',
    name: 'Cahaya Lentera',
    description: 'Semburan cahaya dari lentera. Damage hampir dua kali serangan biasa.',
    kind: 'damage',
    mpCost: 8,
    minLevel: 1,
    power: 1.9,
  },
  pulih_lentera: {
    id: 'pulih_lentera',
    name: 'Hangat Lentera',
    description: 'Kehangatan lentera menyembuhkan luka. Memulihkan 35 HP.',
    kind: 'heal',
    mpCost: 10,
    minLevel: 2,
    heal: 35,
  },
};

export function validateSkills(): void {
  const errors: string[] = [];
  for (const s of Object.values(SKILLS)) {
    if (s.mpCost < 0) errors.push(`skill "${s.id}" MP tidak boleh negatif`);
    if (s.kind === 'damage' && (s.power ?? 0) <= 0) {
      errors.push(`skill "${s.id}" bertipe damage tapi power kosong`);
    }
    if (s.kind === 'heal' && (s.heal ?? 0) <= 0) {
      errors.push(`skill "${s.id}" bertipe heal tapi heal kosong`);
    }
  }
  if (errors.length > 0) {
    throw new Error(`Data skill tidak valid:\n- ${errors.join('\n- ')}`);
  }
}
