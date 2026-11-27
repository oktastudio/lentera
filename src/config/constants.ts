// Konstanta global LENTERA. Satu-satunya tempat angka dasar didefinisikan.

export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;
export const TILE_SIZE = 32;

export const PLAYER_SPEED = 80; // piksel per detik

export const SceneKeys = {
  Boot: 'BootScene',
  Preload: 'PreloadScene',
  World: 'WorldScene',
} as const;

export const TextureKeys = {
  Nara: 'tex-nara',
} as const;

export const Colors = {
  background: 0x0b0820,
  nara: 0xffc857,
  naraOutline: 0x3b1f0b,
  lantern: 0xfff3b0,
  // Kota Terbalik
  road: 0x3a2f5c,
  roadMark: 0x5b4a8a,
  sky: 0x4aa3df,
  skyCloud: 0x8fd0f5,
  puddle: 0x9ad7ff,
  puddleDeep: 0x2b6fb0,
  building: 0x7a3b8f,
  buildingEdge: 0xb86fd1,
  window: 0xffe08a,
  doorDark: 0x2a1240,
  pole: 0x3b1f0b,
} as const;
