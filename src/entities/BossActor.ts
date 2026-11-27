import Phaser from 'phaser';
import { TILE_SIZE } from '@/config/constants';
import type { BossDef, BossSpawn } from '@/data/bosses';
import { IsoView } from '@/world/IsoView';
import { MONSTER_TEXTURE } from '@/world/monsterTexture';

// Boss di peta: diam di tempat, menjadi penghalang, dan bisa ditantang lewat
// tombol aksi. Sprite ini adalah badan logika di ruang dunia (tidak terlihat);
// yang terlihat adalah this.view. Teksturnya dibuat lebih dulu lewat
// ensureMonsterTexture().
export class BossActor extends Phaser.Physics.Arcade.Sprite {
  readonly def: BossDef;
  readonly spawnId: string;
  private readonly view: IsoView;
  private readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, def: BossDef, spawn: BossSpawn) {
    const x = spawn.tileX * TILE_SIZE + TILE_SIZE / 2;
    const y = spawn.tileY * TILE_SIZE + TILE_SIZE / 2;
    super(scene, x, y, MONSTER_TEXTURE);
    this.def = def;
    this.spawnId = spawn.id;

    scene.add.existing(this);
    this.setScale(2); // dua kali lebih besar dari monster biasa
    scene.physics.add.existing(this, true); // true = badan statis
    this.setTint(def.tint);
    this.setVisible(false);

    this.view = new IsoView(scene, this);
    this.label = scene.add
      .text(this.view.image.x, this.view.top - 2, def.name, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#ffc857',
      })
      .setStroke('#0b0820', 2)
      .setOrigin(0.5, 1)
      .setDepth(this.view.image.depth + 1);
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.view.sync(); // agar gambar tetap "bernapas"
  }

  override destroy(fromScene?: boolean): void {
    this.view.destroy();
    this.label.destroy();
    super.destroy(fromScene);
  }
}
