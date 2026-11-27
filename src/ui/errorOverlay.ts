// Menampilkan error di layar. Di HP tidak ada konsol, jadi tanpa ini data yang
// salah ketik hanya terlihat sebagai layar kosong. Spanduk ini tidak menutupi
// seluruh layar dan bisa ditutup.
function ensureBanner(): HTMLPreElement {
  const existing = document.getElementById('fatal-error');
  if (existing instanceof HTMLPreElement) return existing;

  const wrap = document.createElement('div');
  wrap.id = 'fatal-error-wrap';
  wrap.style.cssText =
    'position:fixed;left:0;right:0;bottom:0;z-index:99999;max-height:45vh;display:flex;' +
    'flex-direction:column;background:#2a0f12;border-top:2px solid #ff8a7a;color:#ffd0c8;' +
    'font:11px/1.4 monospace;';

  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Tutup pesan error';
  close.style.cssText =
    'flex:none;min-height:36px;background:#5a1d1d;color:#fff;border:0;font:inherit;';
  close.addEventListener('click', () => {
    wrap.remove();
  });

  const box = document.createElement('pre');
  box.id = 'fatal-error';
  box.style.cssText = 'margin:0;padding:8px;overflow:auto;white-space:pre-wrap;';

  wrap.append(close, box);
  document.body.append(wrap);
  return box;
}

function show(message: string): void {
  ensureBanner().textContent += `${message}\n\n`;
}

export function installErrorOverlay(): void {
  window.addEventListener('error', (event) => {
    // Pesan ini tidak berbahaya dan sering muncul di browser HP.
    if (event.message.includes('ResizeObserver')) return;
    show(`Error: ${event.message}`);
  });
  window.addEventListener('unhandledrejection', (event) => {
    const reason: unknown = event.reason;
    show(`Error: ${reason instanceof Error ? reason.message : String(reason)}`);
  });
}
