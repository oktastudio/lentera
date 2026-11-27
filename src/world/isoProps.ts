import Phaser from 'phaser';
import { Colors } from '@/config/constants';

// Tile berdiri ("prop"): alasnya berlian datar, bendanya digambar tegak di
// atasnya (misalnya lampu jalan). Kuncinya sama dengan kunci tekstur tile.
export interface IsoProp {
  readonly groundKey: string; // kunci tekstur persegi yang dipakai untuk alas
  readonly width: number;
  readonly height: number;
  readonly paint: (g: Phaser.GameObjects.Graphics) => void;
}

export const ISO_PROPS: Readonly<Record<string, IsoProp>> = {
  // Lampu jalan terbalik: tiang dari atas, bohlam menggantung di bawah.
  'tile-lamp': {
    groundKey: 'tile-sky',
    width: 16,
    height: 32,
    paint: (g) => {
      g.fillStyle(Colors.pole, 1);
      g.fillRect(7, 0, 2, 22);
      g.fillRect(3, 21, 10, 11);
      g.fillStyle(Colors.lantern, 1);
      g.fillRect(4, 22, 8, 9);
    },
  },
};

// Tinggi blok padat per tile (piksel di layar). Yang tidak tercantum memakai
// ISO_DEFAULT_BLOCK_HEIGHT.
export const BLOCK_HEIGHTS: Readonly<Record<string, number>> = {
  'tile-building': 24,
};
