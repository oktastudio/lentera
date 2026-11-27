import Phaser from 'phaser';
import { TILE_SIZE } from '@/config/constants';
import { ISO_DEFAULT_BLOCK_HEIGHT, ISO_TILE_H, ISO_TILE_W } from '@/world/iso';
import { BLOCK_HEIGHTS, ISO_PROPS, type IsoProp } from '@/world/isoProps';
import { TILE_DEFS, type TileDef } from '@/world/tiles';

// Mengubah gambar placeholder persegi (yang sudah ada) menjadi gambar
// isometrik secara otomatis, jadi semua tile lama dan tile wilayah baru ikut
// berubah tanpa digambar ulang:
//   - tile datar   -> berlian 32x16
//   - tile padat   -> blok: atap berlian + dua sisi (kiri lebih terang)
//   - tile "prop"  -> alas berlian + benda tegak (lihat isoProps.ts)

export const ISO_SUFFIX = ':iso';
export const PROP_SUFFIX = ':prop';
export const SHADOW_TEXTURE = 'tex-shadow';
export const BLANK_TEXTURE = 'tex-blank';

export type IsoKind = 'flat' | 'block' | 'prop';

export interface IsoTileInfo {
  readonly kind: IsoKind;
  readonly texture: string; // gambar utama tile
  readonly groundTexture: string | null; // alas berlian (hanya untuk prop)
  readonly height: number; // tinggi blok atau prop di layar (0 untuk datar)
}

export function isoTileInfo(def: TileDef): IsoTileInfo {
  const prop = ISO_PROPS[def.key] as IsoProp | undefined;
  if (prop) {
    return {
      kind: 'prop',
      texture: def.key + PROP_SUFFIX,
      groundTexture: prop.groundKey + ISO_SUFFIX,
      height: prop.height,
    };
  }
  if (def.solid) {
    const height = (BLOCK_HEIGHTS[def.key] as number | undefined) ?? ISO_DEFAULT_BLOCK_HEIGHT;
    return { kind: 'block', texture: def.key + ISO_SUFFIX, groundTexture: null, height };
  }
  return { kind: 'flat', texture: def.key + ISO_SUFFIX, groundTexture: null, height: 0 };
}

function readPixels(scene: Phaser.Scene, key: string): ImageData {
  const source = scene.textures.get(key).getSourceImage() as HTMLCanvasElement | HTMLImageElement;
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D tidak tersedia');
  ctx.drawImage(source, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function putTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
    data: Uint8ClampedArray<ArrayBuffer>,
): void {
  const texture = scene.textures.createCanvas(key, width, height);
  if (!texture) throw new Error(`Tekstur "${key}" gagal dibuat`);
  texture.getContext().putImageData(new ImageData(data, width, height), 0, 0);
  texture.refresh();
}

function copyPixel(
  src: ImageData,
  sx: number,
  sy: number,
  dst: Uint8ClampedArray,
  di: number,
  shade: number,
): void {
  const x = Math.min(src.width - 1, Math.max(0, Math.floor(sx)));
  const y = Math.min(src.height - 1, Math.max(0, Math.floor(sy)));
  const si = (y * src.width + x) * 4;
  dst[di] = src.data[si] * shade;
  dst[di + 1] = src.data[si + 1] * shade;
  dst[di + 2] = src.data[si + 2] * shade;
  dst[di + 3] = src.data[si + 3];
}

// Warna rata-rata gambar (piksel yang tidak transparan), dikalikan boost.
function averageColor(src: ImageData, boost: number): [number, number, number] {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < src.data.length; i += 4) {
    if (src.data[i + 3] === 0) continue;
    r += src.data[i];
    g += src.data[i + 1];
    b += src.data[i + 2];
    n += 1;
  }
  if (n === 0) return [0, 0, 0];
  return [
    Math.min(255, (r / n) * boost),
    Math.min(255, (g / n) * boost),
    Math.min(255, (b / n) * boost),
  ];
}

// Persegi -> berlian 32x16: setiap piksel berlian dicari padanannya di gambar asal.
function makeDiamond(scene: Phaser.Scene, srcKey: string): void {
  const key = srcKey + ISO_SUFFIX;
  if (scene.textures.exists(key)) return;

  const src = readPixels(scene, srcKey);
  const w = ISO_TILE_W;
  const h = ISO_TILE_H;
  const a = w / 2 / TILE_SIZE;
  const b = h / 2 / TILE_SIZE;
  const out = new Uint8ClampedArray(w * h * 4);

  for (let iy = 0; iy < h; iy++) {
    for (let ix = 0; ix < w; ix++) {
      const px = ix + 0.5 - w / 2;
      const py = iy + 0.5;
      const wx = (px / a + py / b) / 2;
      const wy = (py / b - px / a) / 2;
      if (wx < 0 || wy < 0 || wx >= TILE_SIZE || wy >= TILE_SIZE) continue;
      copyPixel(src, (wx * src.width) / TILE_SIZE, (wy * src.height) / TILE_SIZE, out, (iy * w + ix) * 4, 1);
    }
  }
  putTexture(scene, key, w, h, out);
}

// Persegi -> blok setinggi "blockHeight" piksel. Titik teratas gambar adalah
// puncak atap; alas berlian ada di bagian bawah gambar.
function makeBlock(scene: Phaser.Scene, srcKey: string, blockHeight: number): void {
  const key = srcKey + ISO_SUFFIX;
  if (scene.textures.exists(key)) return;

  const src = readPixels(scene, srcKey);
  const w = ISO_TILE_W;
  const h = ISO_TILE_H;
  const total = h + blockHeight;
  const slope = h / w;
  const out = new Uint8ClampedArray(w * total * 4);
  const [rr, rg, rb] = averageColor(src, 1.18);

  for (let iy = 0; iy < total; iy++) {
    for (let ix = 0; ix < w; ix++) {
      const cx = ix + 0.5;
      const cy = iy + 0.5;
      const di = (iy * w + ix) * 4;

      const inTop = Math.abs(cx - w / 2) / (w / 2) + Math.abs(cy - h / 2) / (h / 2) <= 1;
      if (inTop) {
        out[di] = rr;
        out[di + 1] = rg;
        out[di + 2] = rb;
        out[di + 3] = 255;
        continue;
      }

      if (cx < w / 2) {
        const edge = h / 2 + cx * slope;
        if (cy >= edge && cy < edge + blockHeight) {
          copyPixel(src, (cx / (w / 2)) * src.width, ((cy - edge) / blockHeight) * src.height, out, di, 0.78);
        }
      } else {
        const edge = h - (cx - w / 2) * slope;
        if (cy >= edge && cy < edge + blockHeight) {
          copyPixel(
            src,
            ((cx - w / 2) / (w / 2)) * src.width,
            ((cy - edge) / blockHeight) * src.height,
            out,
            di,
            0.58,
          );
        }
      }
    }
  }
  putTexture(scene, key, w, total, out);
}

function makeProp(scene: Phaser.Scene, tileKey: string, prop: IsoProp): void {
  const key = tileKey + PROP_SUFFIX;
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  prop.paint(g);
  g.generateTexture(key, prop.width, prop.height);
  g.destroy();
}

function makeShadow(scene: Phaser.Scene): void {
  if (scene.textures.exists(SHADOW_TEXTURE)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0x000000, 0.35);
  g.fillEllipse(8, 4, 16, 6);
  g.generateTexture(SHADOW_TEXTURE, 16, 8);
  g.destroy();
}

// Tekstur kosong untuk badan tabrakan yang tidak perlu terlihat.
function makeBlank(scene: Phaser.Scene): void {
  if (scene.textures.exists(BLANK_TEXTURE)) return;
  scene.textures.createCanvas(BLANK_TEXTURE, 2, 2);
}

// Dipanggil PreloadScene setelah semua gambar persegi selesai dibuat.
export function buildIsoTextures(scene: Phaser.Scene): void {
  makeShadow(scene);
  makeBlank(scene);

  for (const def of Object.values(TILE_DEFS)) {
    const prop = ISO_PROPS[def.key] as IsoProp | undefined;
    if (prop) {
      makeDiamond(scene, prop.groundKey);
      makeProp(scene, def.key, prop);
    } else if (def.solid) {
      const height = (BLOCK_HEIGHTS[def.key] as number | undefined) ?? ISO_DEFAULT_BLOCK_HEIGHT;
      makeBlock(scene, def.key, height);
    } else {
      makeDiamond(scene, def.key);
    }
  }
}
