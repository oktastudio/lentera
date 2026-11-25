// Kamus karakter peta -> tekstur dan sifat tile.
// Menambah jenis tile baru cukup menambah satu baris di sini
// (plus gambar placeholder-nya).

export interface TileDef {
  readonly key: string; // kunci tekstur Phaser
  readonly solid: boolean; // true = menghalangi Nara
}

export const TILE_DEFS: Readonly<Record<string, TileDef>> = {
  '.': { key: 'tile-road', solid: false }, // jalan
  ',': { key: 'tile-sky', solid: false }, // tanah berwujud langit
  '~': { key: 'tile-puddle', solid: false }, // genangan langit
  '#': { key: 'tile-building', solid: true }, // gedung terbalik
  D: { key: 'tile-door', solid: false }, // pintu (hiasan)
  L: { key: 'tile-lamp', solid: true }, // lampu jalan terbalik
};
