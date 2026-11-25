import Phaser from 'phaser';
import { Colors, SceneKeys, TextureKeys, TILE_SIZE } from '@/config/constants';

// Semua aset di fase ini adalah placeholder yang digambar lewat kode.
// Nanti diganti file pixel art asli tanpa mengubah kunci tekstur.
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Preload);
  }

  create(): void {
    this.createNaraTexture();
    this.createGroundTexture(TextureKeys.TileGround, Colors.ground, Colors.groundAlt);
    this.createGroundTexture(TextureKeys.TileGroundAlt, Colors.groundAlt, Colors.ground);
    this.createWallTexture();
    this.scene.start(SceneKeys.World);
  }

  private makeTexture(
    key: string,
    width: number,
    height: number,
    draw: (g: Phaser.GameObjects.Graphics) => void,
  ): void {
    if (this.textures.exists(key)) return;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    draw(g);
    g.generateTexture(key, width, height);
    g.destroy();
  }

  private createNaraTexture(): void {
    this.makeTexture(TextureKeys.Nara, 16, 20, (g) => {
      g.fillStyle(Colors.naraOutline, 1);
      g.fillRect(2, 0, 12, 20);
      g.fillStyle(Colors.nara, 1);
      g.fillRect(3, 1, 10, 18);
      g.fillStyle(Colors.naraOutline, 1);
      g.fillRect(5, 5, 2, 2);
      g.fillRect(9, 5, 2, 2);
      // Lentera di sisi kanan
      g.fillStyle(Colors.lantern, 1);
      g.fillRect(12, 11, 4, 5);
    });
  }

  private createGroundTexture(key: string, base: number, dot: number): void {
    this.makeTexture(key, TILE_SIZE, TILE_SIZE, (g) => {
      g.fillStyle(base, 1);
      g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
      g.fillStyle(dot, 1);
      g.fillRect(4, 6, 2, 2);
      g.fillRect(20, 12, 2, 2);
      g.fillRect(10, 24, 2, 2);
      g.fillRect(26, 26, 2, 2);
    });
  }

  private createWallTexture(): void {
    this.makeTexture(TextureKeys.TileWall, TILE_SIZE, TILE_SIZE, (g) => {
      g.fillStyle(Colors.wall, 1);
      g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
      g.fillStyle(Colors.wallEdge, 1);
      g.fillRect(0, 0, TILE_SIZE, 3);
      g.fillRect(0, 15, TILE_SIZE, 2);
      g.fillRect(15, 0, 2, 15);
      g.fillRect(7, 17, 2, 15);
      g.fillRect(23, 17, 2, 15);
    });
  }
}
