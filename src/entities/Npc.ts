import Phaser from 'phaser';
import { TILE_SIZE } from '@/config/constants';
import type { NpcDef } from '@/data/npcs';
import { IsoView } from '@/world/IsoView';
import { NPC_TEXTURE } from '@/world/npcTexture';

// NPC diam di tempat dan menjadi penghalang. Sprite ini adalah badan logika
// di ruang dunia (tidak terlihat); yang terlihat adalah this.view. Teksturnya
// dibuat lebih dulu lewat ensureNpcTexture() sebelum kelas ini dibuat.
export class Npc extends Phaser.Physics.Arcade.Sprite {
  readonly def: NpcDef;
  private readonly view: IsoView;
  private readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, def: NpcDef) {
    const x = def.tileX * TILE_SIZE + TILE_SIZE / 2;
    const y = def.tileY * TILE_SIZE + TILE_SIZE / 2;
    super(scene, x, y, NPC_TEXTURE);
    this.def = def;

    scene.add.existing(this);
    scene.physics.add.existing(this, true); // true = badan statis
    this.setTint(def.tint);
    this.setVisible(false);

    this.view = new IsoView(scene, this);
    this.label = scene.add
      .text(this.view.image.x, this.view.top - 1, def.name, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#fff3b0',
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
