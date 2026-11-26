import '@/ui/ui-account.css';
import { describeAuthError, linkGoogle, session, signOutUser } from '@/firebase/auth';
import { isFirebaseConfigured } from '@/firebase/firebaseConfig';
import { autoSave } from '@/save/AutoSave';
import { el } from '@/ui/dom';

// Bagian akun di bawah panel Tas: nama akun, hubungkan Google, keluar.
export function createAccountFooter(): HTMLElement {
  const box = el('div', 'account-footer');
  const info = el('span');
  const actions = el('div', 'account-actions');
  const status = el('div', 'account-status');
  box.append(info, actions, status);

  const makeButton = (label: string, onClick: () => void): HTMLButtonElement => {
    const b = el('button', 'btn', label);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  };

  const render = (): void => {
    info.textContent = `Akun: ${session.label}`;
    const buttons: HTMLButtonElement[] = [];

    if (session.mode === 'guest') {
      buttons.push(
        makeButton('Hubungkan Google', () => {
          void connect();
        }),
      );
    }
    if (session.mode !== 'offline') {
      buttons.push(
        makeButton('Keluar akun', () => {
          void logout();
        }),
      );
    } else if (isFirebaseConfigured()) {
      buttons.push(
        makeButton('Masuk akun', () => {
          if (window.confirm('Progres sesi offline ini tidak akan terbawa. Lanjutkan?')) {
            window.location.reload();
          }
        }),
      );
    }
    actions.replaceChildren(...buttons);
  };

  const connect = async (): Promise<void> => {
    status.textContent = 'Menghubungkan...';
    try {
      await linkGoogle();
      status.textContent = '';
      render();
      autoSave.requestSave();
    } catch (error) {
      status.textContent = describeAuthError(error);
    }
  };

  const logout = async (): Promise<void> => {
    if (
      session.mode === 'guest' &&
      !window.confirm(
        'Kamu main sebagai tamu. Kalau keluar, progres akun tamu ini tidak bisa dibuka lagi. Hubungkan Google dulu supaya aman. Tetap keluar?',
      )
    ) {
      return;
    }
    status.textContent = 'Menyimpan lalu keluar...';
    await autoSave.flush();
    try {
      await signOutUser();
      window.location.reload();
    } catch (error) {
      status.textContent = describeAuthError(error);
    }
  };

  render();
  return box;
}
