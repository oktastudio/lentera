import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '@/config/constants';
import { createGameConfig } from '@/config/gameConfig';
import { STARTING_GOLD, STARTING_ITEMS } from '@/data/startingKit';
import { chooseOffline, restoreSession, session } from '@/firebase/auth';
import { isFirebaseConfigured } from '@/firebase/firebaseConfig';
import { loadSave, type LoadResult } from '@/firebase/saves';
import { autoSave } from '@/save/AutoSave';
import { applySave } from '@/save/SaveData';
import { character } from '@/systems/CharacterState';
import { gameBus } from '@/systems/EventBus';
import { mountUi } from '@/ui/index';
import { askLogin } from '@/ui/LoginScreen';
import { initInstall } from '@/pwa/install';
import { registerServiceWorker } from '@/pwa/register';

let game: Phaser.Game | null = null;
initInstall();
registerServiceWorker();

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

function giveStartingKit(): void {
  character.addGold(STARTING_GOLD);
  for (const item of STARTING_ITEMS) character.addItem(item.id, item.qty);
}

// Memuat simpanan pemain, atau memulai permainan baru. Simpan otomatis hanya
// dinyalakan bila simpanan berhasil dibaca (atau memang belum ada), supaya
// data lama di server tidak pernah tertimpa karena kegagalan memuat.
async function startSession(): Promise<void> {
  const uid = session.uid;
  if (session.mode === 'offline' || !uid) {
    giveStartingKit();
    return;
  }

  gameBus.emit('toast', 'Memuat progres...');
  let result: LoadResult;
  try {
    result = await loadSave(uid);
  } catch (error) {
    console.error('Gagal memuat simpanan', error);
    giveStartingKit();
    gameBus.emit('toast', 'Gagal memuat simpanan. Progres kali ini tidak akan disimpan.');
    return;
  }

  switch (result.kind) {
    case 'ok':
      applySave(result.data);
      autoSave.start(uid);
      gameBus.emit('toast', 'Progres dimuat');
      break;
    case 'none':
      giveStartingKit();
      autoSave.start(uid);
      autoSave.requestSave();
      break;
    case 'invalid':
      giveStartingKit();
      gameBus.emit(
        'toast',
        'Simpanan tidak bisa dibaca. Penyimpanan otomatis dimatikan agar data lama aman.',
      );
      break;
  }
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
  await startSession();

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
