import Phaser from 'phaser';

export const PICKUP_TEXTURE = 'tex-pickup';

// Permata putih kecil. Warnanya diberikan lewat tint, jadi satu tekstur cukup.
export function ensurePickupTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(PICKUP_TEXTURE)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0x1a1236, 1);
  g.fillRect(5, 0, 2, 12);
  g.fillRect(3, 1, 6, 10);
  g.fillRect(1, 3, 10, 6);
  g.fillStyle(0xffffff, 1);
  g.fillRect(5, 2, 2, 8);
  g.fillRect(4, 3, 4, 6);
  g.fillRect(3, 4, 6, 4);
  g.generateTexture(PICKUP_TEXTURE, 12, 12);
  g.destroy();
}
