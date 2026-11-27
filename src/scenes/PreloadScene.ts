import Phaser from 'phaser';
import { Colors, SceneKeys, TextureKeys, TILE_SIZE } from '@/config/constants';
import { TILE_DEFS } from '@/world/tiles';
import { REGION_TILE_PAINTERS } from '@/world/regionTiles';
type Painter = (g: Phaser.GameObjects.Graphics) => void;

const S = TILE_SIZE;

function paintSkyBase(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(Colors.sky, 1);
  g.fillRect(0, 0, S, S);
  g.fillStyle(Colors.skyCloud, 1);
  g.fillRect(6, 8, 6, 2);
  g.fillRect(8, 6, 3, 2);
  g.fillRect(20, 22, 6, 2);
  g.fillRect(22, 20, 3, 2);
}

function paintBuildingBase(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(Colors.building, 1);
  g.fillRect(0, 0, S, S);
  g.fillStyle(Colors.buildingEdge, 1);
  g.fillRect(0, 0, S, 3);
  g.fillRect(0, S - 2, S, 2);
}

// Gambar placeholder tiap tile. Kuncinya harus sama dengan di world/tiles.ts.
const TILE_PAINTERS: Readonly<Record<string, Painter>> = {
  'tile-road': (g) => {
    g.fillStyle(Colors.road, 1);
    g.fillRect(0, 0, S, S);
    g.fillStyle(Colors.roadMark, 1);
    g.fillRect(4, 15, 8, 2);
    g.fillRect(20, 15, 8, 2);
    g.fillRect(14, 4, 2, 2);
    g.fillRect(8, 26, 2, 2);
  },
  'tile-sky': (g) => {
    paintSkyBase(g);
  },
  'tile-puddle': (g) => {
    paintSkyBase(g);
    g.fillStyle(Colors.puddleDeep, 1);
    g.fillRect(3, 8, 26, 16);
    g.fillStyle(Colors.puddle, 1);
    g.fillRect(5, 10, 22, 12);
    g.fillStyle(Colors.skyCloud, 1);
    g.fillRect(8, 12, 6, 2);
  },
  'tile-building': (g) => {
    paintBuildingBase(g);
    g.fillStyle(Colors.window, 1);
    g.fillRect(5, 7, 6, 6);
    g.fillRect(21, 7, 6, 6);
    g.fillRect(5, 19, 6, 6);
    g.fillRect(21, 19, 6, 6);
  },
  'tile-door': (g) => {
    paintBuildingBase(g);
    g.fillStyle(Colors.doorDark, 1);
    g.fillRect(10, 6, 12, 26);
    g.fillStyle(Colors.lantern, 1);
    g.fillRect(18, 20, 2, 2);
  },
  // Lampu jalan terbalik: tiang dari atas, bohlam menggantung di bawah.
  'tile-lamp': (g) => {
    paintSkyBase(g);
    g.fillStyle(Colors.pole, 1);
    g.fillRect(15, 0, 2, 19);
    g.fillRect(10, 19, 12, 10);
    g.fillStyle(Colors.lantern, 1);
    g.fillRect(11, 20, 10, 8);
  },
};

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Preload);
  }

  create(): void {
    this.createNara();
    for (const [key, paint] of Object.entries(TILE_PAINTERS)) {
      this.makeTexture(key, S, S, paint);
    }
        for (const [key, paint] of Object.entries(REGION_TILE_PAINTERS)) {
      this.makeTexture(key, S, S, paint);
    }
    this.verifyTiles();
    this.scene.start(SceneKeys.World);
  }

  private makeTexture(key: string, width: number, height: number, paint: Painter): void {
    if (this.textures.exists(key)) return;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    paint(g);
    g.generateTexture(key, width, height);
    g.destroy();
  }

  private createNara(): void {
    this.makeTexture(TextureKeys.Nara, 16, 20, (g) => {
      g.fillStyle(Colors.naraOutline, 1);
      g.fillRect(2, 0, 12, 20);
      g.fillStyle(Colors.nara, 1);
      g.fillRect(3, 1, 10, 18);
      g.fillStyle(Colors.naraOutline, 1);
      g.fillRect(5, 5, 2, 2);
      g.fillRect(9, 5, 2, 2);
      g.fillStyle(Colors.lantern, 1);
      g.fillRect(12, 11, 4, 5);
    });
  }

  // Pengaman: setiap tile di kamus harus punya gambar.
  private verifyTiles(): void {
    for (const [ch, def] of Object.entries(TILE_DEFS)) {
      if (!this.textures.exists(def.key)) {
        throw new Error(`Tekstur "${def.key}" untuk tile "${ch}" belum dibuat`);
      }
    }
  }
}
