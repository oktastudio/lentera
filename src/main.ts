import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '@/config/constants';
import { createGameConfig } from '@/config/gameConfig';

// Integer scaling: zoom selalu bilangan bulat supaya pixel art tetap tajam.
function computeZoom(): number {
  const zoom = Math.floor(
    Math.min(window.innerWidth / GAME_WIDTH, window.innerHeight / GAME_HEIGHT),
  );
  return Math.max(1, zoom);
}

const game = new Phaser.Game(createGameConfig(computeZoom()));

window.addEventListener('resize', () => {
  game.scale.setZoom(computeZoom());
});
