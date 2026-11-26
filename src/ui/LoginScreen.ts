import '@/ui/ui-login.css';
import { chooseOffline, describeAuthError, signInGoogle, signInGuest } from '@/firebase/auth';
import { el } from '@/ui/dom';

// Menampilkan layar login. Selesai (resolve) setelah pemain berhasil masuk
// atau memilih main tanpa akun. Kegagalan login hanya menampilkan pesan.
export function askLogin(): Promise<void> {
  const root = document.getElementById('ui-root');
  if (!root) throw new Error('Elemen #ui-root tidak ditemukan di index.html');

  return new Promise<void>((resolve) => {
    const backdrop = el('div', 'login-backdrop');
    const box = el('div', 'login-box');
    const status = el('div', 'login-status');

    const guest = el('button', 'btn primary', 'Main sebagai tamu');
    const google = el('button', 'btn', 'Masuk dengan Google');
    const offline = el('button', 'login-link', 'Main tanpa akun (progres tidak tersimpan)');
    for (const b of [guest, google, offline]) b.type = 'button';

    const setBusy = (busy: boolean): void => {
      guest.disabled = busy;
      google.disabled = busy;
      offline.disabled = busy;
    };

    const finish = (): void => {
      backdrop.remove();
      resolve();
    };

    const run = async (action: () => Promise<void>): Promise<void> => {
      setBusy(true);
      status.textContent = 'Menghubungkan...';
      try {
        await action();
        finish();
      } catch (error) {
        status.textContent = describeAuthError(error);
        setBusy(false);
      }
    };

    guest.addEventListener('click', () => {
      void run(signInGuest);
    });
    google.addEventListener('click', () => {
      void run(signInGoogle);
    });
    offline.addEventListener('click', () => {
      chooseOffline();
      finish();
    });

    box.append(
      el('div', 'login-title', 'LENTERA'),
      el('div', 'login-subtitle', 'Dunia yang Salah Ingat'),
      guest,
      google,
      el(
        'div',
        'login-hint',
        'Tamu: progres tersimpan di browser ini. Google: progres bisa dibuka lagi dari perangkat lain.',
      ),
      status,
      offline,
    );
    backdrop.append(box);
    root.append(backdrop);
  });
}
