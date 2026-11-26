import { writeSave } from '@/firebase/saves';
import { gameBus } from '@/systems/EventBus';

export type SaveStatus = 'off' | 'saving' | 'saved' | 'error';

const DEBOUNCE_MS = 3000; // tunggu perubahan berhenti sebelum menyimpan
const RETRY_MS = 10000; // jeda sebelum mencoba lagi bila gagal

// Menyimpan otomatis ke Firestore. Hanya aktif setelah start(uid) dipanggil,
// jadi mode offline dan simpanan yang gagal dimuat tidak pernah menulis.
class AutoSave {
  private uid: string | null = null;
  private timer: number | null = null;
  private dirty = false;
  private inflight: Promise<void> | null = null;
  private listening = false;

  start(uid: string): void {
    this.uid = uid;
    if (this.listening) return;
    this.listening = true;

    const mark = (): void => {
      this.requestSave();
    };
    gameBus.on('character:changed', mark);
    gameBus.on('quest:changed', mark);
    gameBus.on('battle:end', mark);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void this.flush();
    });
    window.addEventListener('pagehide', () => {
      void this.flush();
    });
    this.emit('saved');
  }

  // Menandai ada yang perlu disimpan (dijadwalkan dengan jeda).
  requestSave(): void {
    if (!this.uid) return;
    this.dirty = true;
    this.schedule(DEBOUNCE_MS);
  }

  // Menyimpan sekarang bila ada perubahan. Tidak pernah melempar error.
  async flush(): Promise<void> {
    if (this.inflight) await this.inflight;
    const uid = this.uid;
    if (!uid || !this.dirty) return;

    this.clearTimer();
    this.dirty = false;
    this.emit('saving');

    const job = (async (): Promise<void> => {
      try {
        await writeSave(uid);
        this.emit('saved');
      } catch (error) {
        console.error('Gagal menyimpan progres', error);
        this.dirty = true;
        this.emit('error');
        this.schedule(RETRY_MS);
      }
    })();

    this.inflight = job;
    await job;
    this.inflight = null;
    if (this.dirty && this.timer === null) this.schedule(DEBOUNCE_MS);
  }

  private schedule(ms: number): void {
    this.clearTimer();
    this.timer = window.setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, ms);
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private emit(status: SaveStatus): void {
    gameBus.emit('save:status', status);
  }
}

export const autoSave = new AutoSave();
