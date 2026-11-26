import '@/ui/ui-account.css';
import { canInstall, isStandalone, onInstallChange, promptInstall } from '@/pwa/install';
import { el } from '@/ui/dom';

async function enterFullscreen(): Promise<void> {
  try {
    await document.documentElement.requestFullscreen();
    // Mengunci layar ke landscape hanya bisa saat layar penuh (Android).
    const orientation = screen.orientation as unknown as {
      lock?: (mode: string) => Promise<void>;
    };
    await orientation.lock?.('landscape');
  } catch (error) {
    console.debug('Layar penuh atau kunci rotasi tidak tersedia', error);
  }
}

// Baris "Tampilan" di bawah panel Tas: layar penuh dan pasang aplikasi.
// Disembunyikan sendiri bila tidak ada tombol yang relevan.
export function createDisplayFooter(): HTMLElement {
  const box = el('div', 'account-footer');
  const actions = el('div', 'account-actions');
  box.append(el('span', undefined, 'Tampilan:'), actions);

  const makeButton = (label: string, onClick: () => void): HTMLButtonElement => {
    const b = el('button', 'btn', label);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  };

  const render = (): void => {
    const buttons: HTMLButtonElement[] = [];
    if (document.fullscreenEnabled && !isStandalone()) {
      buttons.push(
        makeButton('Layar penuh', () => {
          void enterFullscreen();
        }),
      );
    }
    if (canInstall()) {
      buttons.push(
        makeButton('Pasang aplikasi', () => {
          void promptInstall();
        }),
      );
    }
    actions.replaceChildren(...buttons);
    box.style.display = buttons.length > 0 ? '' : 'none';
  };

  onInstallChange(render);
  render();
  return box;
}
