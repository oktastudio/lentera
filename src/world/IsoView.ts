import Phaser from 'phaser';
import { depthOf, project, type Point } from '@/world/iso';
import { SHADOW_TEXTURE } from '@/world/isoTextures';

const FOOT_OFFSET = 3; // kaki gambar sedikit di bawah titik pijak
const MOVE_THRESHOLD = 12; // kecepatan (px/detik) di atas ini dianggap sedang berjalan

// Tampilan isometrik untuk satu makhluk. Sprite "logika" (yang punya badan
// fisika) tetap di ruang dunia dan tidak terlihat; IsoView menggambar
// gambar tegak di posisi hasil proyeksi, lengkap dengan bayangan, lalu
// menyalin skala, transparansi, dan warna dari sprite logika setiap kali sync().
// Agar terasa hidup: gambar "bernapas" saat diam dan melonjak kecil saat berjalan.
export class IsoView {
  readonly image: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Image | null;
  private readonly point: Point = { x: 0, y: 0 };
  private readonly phase = Math.random() * Math.PI * 2; // supaya tiap makhluk tidak serempak

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly logic: Phaser.Physics.Arcade.Sprite,
    withShadow = true,
  ) {
    this.image = scene.add.image(0, 0, logic.texture.key).setOrigin(0.5, 1);
    this.shadow = withShadow ? scene.add.image(0, 0, SHADOW_TEXTURE) : null;
    this.sync();
  }

  // Titik teratas gambar di layar (untuk menaruh nama atau bar di atas kepala).
  get top(): number {
    return this.image.y - this.image.displayHeight;
  }

  sync(): void {
    const body = this.logic.body;
    if (!body) return;

    const wx = body.center.x;
    const wy = body.center.y;
    project(wx, wy, this.point);
    const x = Math.round(this.point.x);
    const y = Math.round(this.point.y);
    const depth = depthOf(wx, wy);

    const t = this.scene.time.now;
    const moving = body instanceof Phaser.Physics.Arcade.Body && body.speed > MOVE_THRESHOLD;
    const breath = Math.sin(t * 0.004 + this.phase);
    const hop = moving ? Math.abs(Math.sin(t * 0.016 + this.phase)) * 2 : 0;

    this.image.setPosition(x, y + FOOT_OFFSET - Math.round(hop));
    this.image.setScale(
      this.logic.scaleX * (1 - breath * 0.015),
      this.logic.scaleY * (1 + breath * 0.035),
    );
    this.image.setAlpha(this.logic.alpha);
    this.image.setFlipX(this.logic.flipX);
    this.image.setDepth(depth + 1);

    if (this.logic.isTinted) {
      if (this.logic.tintFill) this.image.setTintFill(this.logic.tintTopLeft);
      else this.image.setTint(this.logic.tintTopLeft);
    } else if (this.image.isTinted) {
      this.image.clearTint();
    }

    if (this.shadow) {
      this.shadow.setPosition(x, y + 1);
      this.shadow.setScale(this.logic.scaleX * (1 - hop * 0.06), this.logic.scaleY * (1 - hop * 0.06));
      this.shadow.setAlpha(this.logic.alpha);
      this.shadow.setDepth(depth);
    }
  }

  destroy(): void {
    this.image.destroy();
    this.shadow?.destroy();
  }
}
