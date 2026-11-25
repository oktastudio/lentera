// Konstanta global LENTERA. Satu-satunya tempat angka dasar didefinisikan.

export const GAME_WIDTH = 320;
export const GAME_HEIGHT = 180;
export const TILE_SIZE = 32;

export const PLAYER_SPEED = 80; // piksel per detik

export const SceneKeys = {
  Boot: 'BootScene',
  Preload: 'PreloadScene',
  World: 'WorldScene',
} as const;

export const TextureKeys = {
  Nara: 'tex-nara',
  TileGround: 'tex-tile-ground',
  TileGroundAlt: 'tex-tile-ground-alt',
  TileWall: 'tex-tile-wall',
} as const;

export const Colors = {
  background: 0x0b0820,
  ground: 0x2b6f6a,
  groundAlt: 0x2f7b75,
  wall: 0x7a3b8f,
  wallEdge: 0xb86fd1,
  nara: 0xffc857,
  naraOutline: 0x3b1f0b,
  lantern: 0xfff3b0,
} as const;
