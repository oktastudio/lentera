// Catatan kejadian di dunia selama sesi berjalan (benda yang sudah diambil, dll).
// Nanti disimpan ke Firestore bersama data karakter.
const collected = new Set<string>();

export const worldFlags = {
  isPickupCollected(mapId: string, pickupId: string): boolean {
    return collected.has(`${mapId}:${pickupId}`);
  },
  collectPickup(mapId: string, pickupId: string): void {
    collected.add(`${mapId}:${pickupId}`);
  },
};
