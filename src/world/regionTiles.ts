import Phaser from 'phaser';

export type TilePainter = (g: Phaser.GameObjects.Graphics) => void;

// Gambar placeholder tile milik wilayah-wilayah baru. Diisi oleh
// installRegions() saat game dimulai, lalu dibaca PreloadScene.
export const REGION_TILE_PAINTERS: Record<string, TilePainter> = {};
