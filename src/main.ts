import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '@/config/constants';
import { createGameConfig } from '@/config/gameConfig';
import { STARTING_GOLD, STARTING_ITEMS } from '@/data/startingKit';
import { chooseOffline, restoreSession, session } from '@/firebase/auth';
import { isFirebaseConfigured } from '@/firebase/firebaseConfig';
import { character } from '@/systems/CharacterState';
import { gameBus } from '@/systems/EventBus';
import { mountUi } from '@/ui/index';
import { askLogin } from '@/ui/LoginScreen';

let game: Phaser.Game | null = null;

// Integer scaling: zoom selalu bilangan bulat supaya pixel art tetap tajam.
function computeZoom(): number {
  const zoom = Math.floor(
    Math.min(window.innerWidth / GAME_WIDTH, window.innerHeight / GAME_HEIGHT),
  );
  return Math.max(1, zoom);
}

// Menentukan siapa yang bermain: lanjut sesi lama, login baru, atau offline.
async function chooseAccount(): Promise<void> {
  if (!isFirebaseConfigured()) {
    chooseOffline();
    return;
  }
  try {
    if (await restoreSession()) return;
  } catch (error) {
    console.error('Gagal memulihkan sesi login', error);
  }
  await askLogin();
}

async function main(): Promise<void> {
  // Game dijeda selama panel Tas terbuka.
  mountUi((open) => {
    if (open) game?.pause();
    else game?.resume();
  });

  // Game juga dijeda selama pertarungan giliran.
  gameBus.on('battle:start', () => {
    game?.pause();
  });
  gameBus.on('battle:end', () => {
    game?.resume();
  });

  await chooseAccount();

  // Bekal uji coba (sementara). Diganti data simpanan di langkah berikutnya.
  character.addGold(STARTING_GOLD);
  for (const item of STARTING_ITEMS) character.addItem(item.id, item.qty);

  game = new Phaser.Game(createGameConfig(computeZoom()));

  gameBus.emit(
    'toast',
    session.mode === 'offline'
      ? 'Mode offline: progres tidak tersimpan'
      : `Masuk sebagai ${session.label}`,
  );
}

window.addEventListener('resize', () => {
  game?.scale.setZoom(computeZoom());
});

main().catch((error: unknown) => {
  console.error(error);
});
