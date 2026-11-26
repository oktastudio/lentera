// Rumus damage bersama untuk semua mode combat (real-time sekarang,
// turn-based untuk boss nanti). Jangan menaruh rumus damage di tempat lain.

type Rng = () => number;

// power = pengali kekuatan serangan (1 = serangan biasa, skill bisa lebih).
export function calculateDamage(
  attack: number,
  defense: number,
  power = 1,
  rng: Rng = Math.random,
): number {
  const base = attack * power - defense * 0.5;
  const variance = 0.9 + rng() * 0.2; // acak 90% sampai 110%
  return Math.max(1, Math.round(base * variance));
}

// Bilangan bulat acak dari min sampai max (keduanya ikut).
export function rollRange(min: number, max: number, rng: Rng = Math.random): number {
  return min + Math.floor(rng() * (max - min + 1));
}

// true dengan peluang "chance" (0 sampai 1).
export function rollChance(chance: number, rng: Rng = Math.random): boolean {
  return rng() < chance;
}
