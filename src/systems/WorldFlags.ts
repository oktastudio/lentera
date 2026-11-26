// Catatan kejadian di dunia selama sesi berjalan (benda yang sudah diambil,
// boss yang sudah dikalahkan, dll). Nanti disimpan ke Firestore bersama
// data karakter.
const collected = new Set<string>();
const defeatedBosses = new Set<string>();

export const worldFlags = {
  isPickupCollected(mapId: string, pickupId: string): boolean {
    return collected.has(`${mapId}:${pickupId}`);
  },
  collectPickup(mapId: string, pickupId: string): void {
    collected.add(`${mapId}:${pickupId}`);
  },
  isBossDefeated(mapId: string, spawnId: string): boolean {
    return defeatedBosses.has(`${mapId}:${spawnId}`);
  },
  defeatBoss(mapId: string, spawnId: string): void {
    defeatedBosses.add(`${mapId}:${spawnId}`);
  },
};
