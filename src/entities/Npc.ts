import Phaser from 'phaser';
import { TILE_SIZE } from '@/config/constants';
import type { NpcDef } from '@/data/npcs';
import { NPC_TEXTURE } from '@/world/npcTexture';

// NPC diam di tempat dan menjadi penghalang. Teksturnya dibuat lebih dulu
// lewat ensureNpcTexture() sebelum kelas ini dibuat.
export class Npc extends Phaser.Physics.Arcade.Sprite {
  readonly def: NpcDef;

  constructor(scene: Phaser.Scene, def: NpcDef) {
    const x = def.tileX * TILE_SIZE + TILE_SIZE / 2;
    const y = def.tileY * TILE_SIZE + TILE_SIZE / 2;
    super(scene, x, y, NPC_TEXTURE);
    this.def = def;

    scene.add.existing(this);
    scene.physics.add.existing(this, true); // true = badan statis
    this.setTint(def.tint);
    this.setDepth(y);

    scene.add
      .text(x, y - 14, def.name, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#fff3b0',
      })
      .setOrigin(0.5, 1)
      .setDepth(y + 1);
  }
}
