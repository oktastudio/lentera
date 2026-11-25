import Phaser from 'phaser';
import { Colors, GAME_HEIGHT, GAME_WIDTH } from '@/config/constants';
import { BootScene } from '@/scenes/BootScene';
import { PreloadScene } from '@/scenes/PreloadScene';
import { WorldScene } from '@/scenes/WorldScene';

export function createGameConfig(zoom: number): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: 'game-root',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: Colors.background,
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    scale: {
      mode: Phaser.Scale.NONE,
      zoom,
      autoCenter: Phaser.Scale.NO_CENTER,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    input: {
      activePointers: 3,
    },
    scene: [BootScene, PreloadScene, WorldScene],
  };
}
