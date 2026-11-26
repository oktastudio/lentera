// Catatan kejadian di dunia (benda yang sudah diambil, boss yang sudah
// dikalahkan). Ikut disimpan ke Firestore lewat exportState/importState.
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

  exportState(): { collectedPickups: string[]; defeatedBosses: string[] } {
    return { collectedPickups: [...collected], defeatedBosses: [...defeatedBosses] };
  },
  importState(save: {
    collectedPickups: readonly string[];
    defeatedBosses: readonly string[];
  }): void {
    collected.clear();
    defeatedBosses.clear();
    for (const k of save.collectedPickups) collected.add(k);
    for (const k of save.defeatedBosses) defeatedBosses.add(k);
  },
};
