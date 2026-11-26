import Phaser from 'phaser';

export const MONSTER_TEXTURE = 'tex-monster';

// Gumpalan putih polos. Warnanya diberikan lewat tint, jadi satu tekstur
// cukup untuk semua monster.
export function ensureMonsterTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(MONSTER_TEXTURE)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0x1a1236, 1);
  g.fillRect(1, 0, 12, 12);
  g.fillRect(0, 2, 14, 8);
  g.fillStyle(0xffffff, 1);
  g.fillRect(2, 1, 10, 10);
  g.fillRect(1, 3, 12, 6);
  g.fillStyle(0x1a1236, 1);
  g.fillRect(3, 4, 2, 2);
  g.fillRect(9, 4, 2, 2);
  g.generateTexture(MONSTER_TEXTURE, 14, 12);
  g.destroy();
}
