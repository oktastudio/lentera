import '@/ui/ui.css';
import '@/ui/ui-extra.css';
import '@/ui/ui-combat.css';
import '@/ui/ui-battle.css';
import { createAccountFooter } from '@/ui/AccountFooter';
import { ActionButton } from '@/ui/ActionButton';
import { AttackButton } from '@/ui/AttackButton';
import { BattleScreen } from '@/ui/BattleScreen';
import { DialogueBox } from '@/ui/DialogueBox';
import { Hud } from '@/ui/Hud';
import { InventoryPanel } from '@/ui/InventoryPanel';
import { QuestTracker } from '@/ui/QuestTracker';
import { SaveBadge } from '@/ui/SaveBadge';
import { Toasts } from '@/ui/Toasts';

// Memasang seluruh UI HTML ke #ui-root.
// onPanelToggle dipanggil saat panel dibuka/ditutup (dipakai untuk jeda game).
export function mountUi(onPanelToggle: (open: boolean) => void): void {
  const root = document.getElementById('ui-root');
  if (!root) throw new Error('Elemen #ui-root tidak ditemukan di index.html');

  const panel = new InventoryPanel(onPanelToggle);
  const hud = new Hud(() => {
    panel.toggle();
  });
  const toasts = new Toasts();
  const tracker = new QuestTracker();
  const action = new ActionButton();
  const attack = new AttackButton();
  const dialogueBox = new DialogueBox();
  const battle = new BattleScreen();
  const saveBadge = new SaveBadge();

  // Bagian akun ditaruh di bawah isi panel Tas.
  panel.root.querySelector('.panel')?.append(createAccountFooter());

  // Urutan = tumpukan layar: yang terakhir paling atas. Notifikasi paling atas.
  root.append(
    hud.root,
    saveBadge.root,
    tracker.root,
    attack.root,
    action.root,
    dialogueBox.root,
    panel.root,
    battle.root,
    toasts.root,
  );
}
