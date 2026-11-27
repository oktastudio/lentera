import { TILE_SIZE } from '@/config/constants';

// Proyeksi isometrik 2:1. Logika game (fisika, tabrakan, jarak, AI) tetap
// berjalan di "ruang dunia": grid persegi dengan sel 32x32 piksel. Hanya
// gambarnya yang diproyeksikan ke layar sebagai berlian.

export const ISO_TILE_W = 32; // lebar berlian satu sel di layar
export const ISO_TILE_H = 16; // tinggi berlian satu sel di layar
export const ISO_DEFAULT_BLOCK_HEIGHT = 20; // tinggi blok padat (gedung, dll)
export const ISO_MOVE_SCALE = 1.5; // pengali kecepatan gerak agar terasa pas di layar iso

const A = ISO_TILE_W / 2 / TILE_SIZE; // pengali sumbu x layar
const B = ISO_TILE_H / 2 / TILE_SIZE; // pengali sumbu y layar

export interface Point {
  x: number;
  y: number;
}

// Ruang dunia (px) -> layar (px). Sudut atas sel (c, r) ada di project(c*32, r*32);
// berlian sel itu menjorok ke bawah dari titik tersebut.
export function project(x: number, y: number, out: Point = { x: 0, y: 0 }): Point {
  out.x = (x - y) * A;
  out.y = (x + y) * B;
  return out;
}

// Urutan gambar: makin besar makin di depan. Dipakai untuk blok dan semua makhluk.
export function depthOf(x: number, y: number): number {
  return x + y;
}

// Arah di layar (kanan = +x, bawah = +y, panjang maksimal 1) -> arah di ruang
// dunia dengan panjang yang sama. Dipakai agar joystick "atas" benar-benar
// berarti atas di layar.
export function screenToWorldDir(sx: number, sy: number, out: Point = { x: 0, y: 0 }): Point {
  const m = Math.hypot(sx, sy);
  if (m === 0) {
    out.x = 0;
    out.y = 0;
    return out;
  }
  const wx = (sx / A + sy / B) / 2;
  const wy = (sy / B - sx / A) / 2;
  const scale = m / Math.hypot(wx, wy);
  out.x = wx * scale;
  out.y = wy * scale;
  return out;
}

export interface IsoBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

// Kotak batas kamera untuk peta berukuran cols x rows sel.
// topPadding = ruang di atas untuk blok tinggi yang menjulang.
export function isoBounds(cols: number, rows: number, topPadding: number): IsoBounds {
  return {
    x: -rows * (ISO_TILE_W / 2),
    y: -topPadding,
    width: (cols + rows) * (ISO_TILE_W / 2),
    height: (cols + rows) * (ISO_TILE_H / 2) + topPadding,
  };
}
