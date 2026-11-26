import type { CharacterSnapshot } from '@/systems/CharacterState';
import type { DialogueView } from '@/systems/DialogueRunner';
import type { QuestSnapshot } from '@/systems/QuestLog';

// Penghubung antara gameplay (Phaser) dan UI (HTML).
// Kedua sisi hanya saling bicara lewat event, tidak saling mengimpor.

export class TypedEmitter<E extends object> {
  private readonly handlers = new Map<keyof E, Array<(payload: unknown) => void>>();

  on<K extends keyof E>(event: K, fn: (payload: E[K]) => void): () => void {
    const list = this.handlers.get(event) ?? [];
    list.push(fn as (payload: unknown) => void);
    this.handlers.set(event, list);
    return () => {
      this.off(event, fn);
    };
  }

  off<K extends keyof E>(event: K, fn: (payload: E[K]) => void): void {
    const list = this.handlers.get(event);
    if (!list) return;
    const i = list.indexOf(fn as (payload: unknown) => void);
    if (i >= 0) list.splice(i, 1);
  }

  emit<K extends keyof E>(event: K, payload: E[K]): void {
    const list = this.handlers.get(event);
    if (!list) return;
    for (const fn of [...list]) fn(payload);
  }
}

export interface GameEvents {
  'character:changed': CharacterSnapshot;
  'quest:changed': QuestSnapshot;
  'dialogue:show': DialogueView;
    'dialogue:end': null;
  'interact:prompt': string | null;
  'interact:press': null;
  toast: string;
}

export const gameBus = new TypedEmitter<GameEvents>();
