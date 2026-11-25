import '@/ui/ui.css';
import { Hud } from '@/ui/Hud';
import { InventoryPanel } from '@/ui/InventoryPanel';
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
  root.append(hud.root, toasts.root, panel.root);
}
