import Phaser from 'phaser';
import { PLAYER_SPEED, TextureKeys } from '@/config/constants';

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TextureKeys.Nara);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);

    // Hitbox kecil di bagian kaki supaya gerak di dekat dinding terasa enak.
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(10, 8);
    body.setOffset(3, 12);
  }

  // direction sudah dinormalisasi oleh InputSystem (panjang maksimal 1).
  move(direction: Phaser.Math.Vector2): void {
    this.setVelocity(direction.x * PLAYER_SPEED, direction.y * PLAYER_SPEED);
    this.setDepth(this.y);
  }
}
