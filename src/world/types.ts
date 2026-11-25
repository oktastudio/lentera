// Tipe data peta LENTERA. Semua peta ditulis sebagai data, bukan kode.

export type RegionId =
  | 'kota_terbalik'
  | 'hutan_bernapas'
  | 'gurun_jam_mati'
  | 'laut_tanpa_air'
  | 'pegunungan_lupa'
  | 'perpustakaan_langit'
  | 'ujung_ingatan';

export interface MapSpawn {
  readonly id: string;
  readonly tileX: number;
  readonly tileY: number;
}

// Area di peta yang memindahkan Nara ke peta lain.
export interface MapExit {
  readonly tileX: number;
  readonly tileY: number;
  readonly widthTiles: number;
  readonly heightTiles: number;
  readonly toMap: string;
  readonly toSpawn: string;
}

export interface MapData {
  readonly id: string;
  readonly name: string;
  readonly region: RegionId;
  // Satu string per baris, satu karakter per tile (lihat tiles.ts).
  readonly tiles: readonly string[];
  readonly spawns: readonly MapSpawn[];
  readonly exits: readonly MapExit[];
}
