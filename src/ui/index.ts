import '@/ui/ui.css';
import '@/ui/ui-extra.css';
import '@/ui/ui-combat.css';
import { ActionButton } from '@/ui/ActionButton';
import { AttackButton } from '@/ui/AttackButton';
import { DialogueBox } from '@/ui/DialogueBox';
import { Hud } from '@/ui/Hud';
import { InventoryPanel } from '@/ui/InventoryPanel';
import { QuestTracker } from '@/ui/QuestTracker';
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

  root.append(
    hud.root,
    tracker.root,
    attack.root,
    action.root,
    toasts.root,
    dialogueBox.root,
    panel.root,
  );
}
