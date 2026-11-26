import Phaser from 'phaser';
import { battleManager } from '@/combat/BattleManager';
import { GAME_HEIGHT, GAME_WIDTH } from '@/config/constants';
import { createGameConfig } from '@/config/gameConfig';
import { BOSSES } from '@/data/bosses';
import { STARTING_GOLD, STARTING_ITEMS } from '@/data/startingKit';
import { character } from '@/systems/CharacterState';
import { gameBus } from '@/systems/EventBus';
import { mountUi } from '@/ui/index';

// Integer scaling: zoom selalu bilangan bulat supaya pixel art tetap tajam.
function computeZoom(): number {
  const zoom = Math.floor(
    Math.min(window.innerWidth / GAME_WIDTH, window.innerHeight / GAME_HEIGHT),
  );
  return Math.max(1, zoom);
}

// Bekal uji coba (sementara).
character.addGold(STARTING_GOLD);
for (const item of STARTING_ITEMS) character.addItem(item.id, item.qty);

const game = new Phaser.Game(createGameConfig(computeZoom()));

// Game dijeda selama panel Tas terbuka.
mountUi((open) => {
  if (open) game.pause();
  else game.resume();
});

// Game juga dijeda selama pertarungan giliran.
gameBus.on('battle:start', () => {
  game.pause();
});
gameBus.on('battle:end', () => {
  game.resume();
});

// ALAT UJI SEMENTARA: buka alamat game dengan tambahan ?uji-boss
// untuk langsung masuk ke pertarungan boss. Dihapus setelah file 24.
if (new URLSearchParams(window.location.search).has('uji-boss')) {
  gameBus.on('battle:end', (info) => {
    if (info.outcome === 'defeat') character.reviveAfterDefeat(0);
  });
  battleManager.start(BOSSES.penunggu_jam);
}

window.addEventListener('resize', () => {
  game.scale.setZoom(computeZoom());
});
