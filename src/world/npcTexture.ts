import Phaser from 'phaser';

export const NPC_TEXTURE = 'tex-npc';

// Sosok putih polos berukuran sama dengan Nara. Warnanya diberikan lewat tint,
// jadi satu tekstur cukup untuk semua NPC.
export function ensureNpcTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(NPC_TEXTURE)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0x1a1236, 1);
  g.fillRect(2, 0, 12, 20);
  g.fillStyle(0xffffff, 1);
  g.fillRect(3, 1, 10, 18);
  g.fillStyle(0x1a1236, 1);
  g.fillRect(5, 5, 2, 2);
  g.fillRect(9, 5, 2, 2);
  g.fillRect(6, 12, 4, 1);
  g.generateTexture(NPC_TEXTURE, 16, 20);
  g.destroy();
}
