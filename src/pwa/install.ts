// Pemasangan aplikasi (PWA). Chrome Android mengirim event
// "beforeinstallprompt" bila game memenuhi syarat dipasang; event itu
// disimpan di sini supaya tombol "Pasang aplikasi" bisa memakainya.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const fn of [...listeners]) fn();
}

// Panggil sedini mungkin saat game dimulai.
export function initInstall(): void {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

export function canInstall(): boolean {
  return deferred !== null;
}

export async function promptInstall(): Promise<void> {
  const prompt = deferred;
  if (!prompt) return;
  deferred = null;
  notify();
  await prompt.prompt();
  await prompt.userChoice;
}

export function onInstallChange(fn: () => void): void {
  listeners.add(fn);
}

// true bila game sedang berjalan sebagai aplikasi terpasang.
export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches;
}
