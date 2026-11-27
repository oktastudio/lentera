import Phaser from 'phaser';
import { depthOf, project, type Point } from '@/world/iso';
import { SHADOW_TEXTURE } from '@/world/isoTextures';

const FOOT_OFFSET = 3; // kaki gambar sedikit di bawah titik pijak

// Tampilan isometrik untuk satu makhluk. Sprite "logika" (yang punya badan
// fisika) tetap di ruang dunia dan tidak terlihat; IsoView menggambar
// gambar tegak di posisi hasil proyeksi, lengkap dengan bayangan, lalu
// menyalin skala, transparansi, dan warna dari sprite logika setiap kali sync().
export class IsoView {
  readonly image: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Image | null;
  private readonly point: Point = { x: 0, y: 0 };

  constructor(
    scene: Phaser.Scene,
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

    this.image.setPosition(x, y + FOOT_OFFSET);
    this.image.setScale(this.logic.scaleX, this.logic.scaleY);
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
      this.shadow.setScale(this.logic.scaleX, this.logic.scaleY);
      this.shadow.setAlpha(this.logic.alpha);
      this.shadow.setDepth(depth);
    }
  }

  destroy(): void {
    this.image.destroy();
    this.shadow?.destroy();
  }
}
