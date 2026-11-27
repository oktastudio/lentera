import Phaser from 'phaser';
import { PLAYER_SPEED, TextureKeys } from '@/config/constants';
import { KNOCKBACK_MS, KNOCKBACK_SPEED, PLAYER_INVULN_MS } from '@/data/combat';
import { ISO_PLAYER_SPEED_FACTOR, screenToWorldDir, screenToWorldVelocity } from '@/world/iso';
import { IsoView } from '@/world/IsoView';

// Sprite ini adalah badan logika Nara di ruang dunia (tidak terlihat).
// Yang terlihat adalah this.view, gambar isometriknya.
export class Player extends Phaser.Physics.Arcade.Sprite {
  // Arah hadap terakhir di ruang dunia (dipakai untuk arah serangan).
  readonly facing = new Phaser.Math.Vector2(Math.SQRT1_2, Math.SQRT1_2); // menghadap bawah layar
  readonly view: IsoView;
  private readonly tmp = { x: 0, y: 0 };
  private knockbackUntil = 0;
  private invulnerableUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TextureKeys.Nara);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setVisible(false);

    // Hitbox kecil di bagian kaki supaya gerak di dekat dinding terasa enak.
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(10, 8);
    body.setOffset(3, 12);

    this.view = new IsoView(scene, this);
  }

  // direction = arah di layar (panjang maksimal 1) dari InputSystem.
  move(direction: Phaser.Math.Vector2): void {
    if (direction.lengthSq() > 0) {
      const f = screenToWorldDir(direction.x, direction.y, this.tmp);
      this.facing.set(f.x, f.y).normalize();
    }
    if (this.scene.time.now < this.knockbackUntil) return; // sedang terdorong

    const speed = PLAYER_SPEED * ISO_PLAYER_SPEED_FACTOR;
    const v = screenToWorldVelocity(direction.x * speed, direction.y * speed, this.tmp);
    this.setVelocity(v.x, v.y);
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

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.view.sync();
  }

  override destroy(fromScene?: boolean): void {
    this.view.destroy();
    super.destroy(fromScene);
  }
}
