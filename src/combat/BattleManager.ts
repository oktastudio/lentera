import type { BossDef } from '@/data/bosses';
import { TurnBattle, type BattleAction } from '@/combat/TurnBattle';
import { gameBus } from '@/systems/EventBus';

// Pintu masuk tunggal untuk pertarungan giliran: dunia game memanggil start(),
// UI memanggil act() dan close() lewat sini.
class BattleManager {
  private current: TurnBattle | null = null;

  get isActive(): boolean {
    return this.current !== null;
  }

  start(boss: BossDef): void {
    if (this.current) return;
    this.current = new TurnBattle(boss);
    gameBus.emit('battle:start', this.current.view());
  }

  act(action: BattleAction): void {
    this.current?.act(action);
  }

  // Hanya berhasil bila pertarungan sudah selesai. Memberi tahu dunia game hasilnya.
  close(): void {
    const battle = this.current;
    const result = battle?.result;
    if (!battle || !result) return;
    this.current = null;
    gameBus.emit('battle:end', result);
  }
}

export const battleManager = new BattleManager();
