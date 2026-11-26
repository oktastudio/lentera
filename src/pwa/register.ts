import { gameBus } from '@/systems/EventBus';

// Mendaftarkan service worker (hanya pada versi build, bukan saat pengembangan).
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;

  const hadController = navigator.serviceWorker.controller !== null;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Pada kunjungan pertama tidak ada versi lama, jadi tidak perlu pemberitahuan.
    if (hadController) {
      gameBus.emit('toast', 'Versi baru siap. Muat ulang halaman untuk memakainya.');
    }
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(new URL('sw.js', document.baseURI))
      .catch((error: unknown) => {
        console.error('Gagal mendaftarkan service worker', error);
      });
  });
}
