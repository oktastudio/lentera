import Phaser from 'phaser';
import { PLAYER_SPEED, TextureKeys } from '@/config/constants';
import { KNOCKBACK_MS, KNOCKBACK_SPEED, PLAYER_INVULN_MS } from '@/data/combat';

export class Player extends Phaser.Physics.Arcade.Sprite {
  // Arah hadap terakhir (dipakai untuk menentukan arah serangan).
  readonly facing = new Phaser.Math.Vector2(0, 1);
  private knockbackUntil = 0;
  private invulnerableUntil = 0;

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
    if (direction.lengthSq() > 0) this.facing.copy(direction).normalize();
    this.setDepth(this.y);
    if (this.scene.time.now < this.knockbackUntil) return; // sedang terdorong
    this.setVelocity(direction.x * PLAYER_SPEED, direction.y * PLAYER_SPEED);
  }

  isInvulnerable(): boolean {
    return this.scene.time.now < this.invulnerableUntil;
  }

  // Dipanggil saat Nara terkena serangan: kebal sebentar, berkedip, terdorong.
  hurt(fromX: number, fromY: number): void {
    const now = this.scene.time.now;
    this.invulnerableUntil = now + PLAYER_INVULN_MS;
    this.knockbackUntil = now + KNOCKBACK_MS;

    const away = new Phaser.Math.Vector2(this.x - fromX, this.y - fromY);
    if (away.lengthSq() === 0) away.set(0, 1);
    away.normalize().scale(KNOCKBACK_SPEED);
    this.setVelocity(away.x, away.y);

    this.scene.tweens.add({
      targets: this,
      alpha: 0.3,
      duration: 80,
      yoyo: true,
      repeat: Math.max(0, Math.floor(PLAYER_INVULN_MS / 160) - 1),
      onComplete: () => {
        this.setAlpha(1);
      },
    });
  }
}
