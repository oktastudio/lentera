import { QUESTS, type QuestDef, type QuestStatus } from '@/data/quests';
import { character } from '@/systems/CharacterState';
import { gameBus } from '@/systems/EventBus';
import { grantReward } from '@/systems/Rewards';

export interface ObjectiveProgress {
  readonly label: string;
  readonly have: number;
  readonly need: number;
  readonly done: boolean;
}

export interface QuestView {
  readonly id: string;
  readonly name: string;
  readonly summary: string;
  readonly status: QuestStatus;
  readonly objectives: readonly ObjectiveProgress[];
}

export interface QuestSnapshot {
  readonly quests: readonly QuestView[];
}

// Catatan quest Nara. Kemajuan dihitung langsung dari isi tas,
// jadi tidak ada angka yang perlu disinkronkan.
class QuestLog {
  private readonly started = new Set<string>();
  private readonly finished = new Set<string>();

  status(questId: string): QuestStatus {
    const def = QUESTS[questId] as QuestDef | undefined;
    if (!def) return 'inactive';
    if (this.finished.has(questId)) return 'completed';
    if (!this.started.has(questId)) return 'inactive';
    const ready = def.objectives.every((o) => character.countItem(o.itemId) >= o.amount);
    return ready ? 'ready' : 'active';
  }

  start(questId: string): boolean {
    const def = QUESTS[questId] as QuestDef | undefined;
    if (!def || this.status(questId) !== 'inactive') return false;
    this.started.add(questId);
    gameBus.emit('toast', `Quest baru: ${def.name}`);
    this.changed();
    return true;
  }

  // Hanya berhasil bila quest berstatus "ready". Aman dipanggil berulang.
  complete(questId: string): boolean {
    const def = QUESTS[questId] as QuestDef | undefined;
    if (!def || this.status(questId) !== 'ready') return false;

    // Tandai selesai dulu supaya tampilan tidak sempat berkedip ke status lain.
    this.finished.add(questId);
    this.started.delete(questId);

    for (const o of def.objectives) character.removeItem(o.itemId, o.amount);

    gameBus.emit('toast', `Quest selesai: ${def.name}`);
    const r = def.reward;
    if (r.gold) grantReward({ kind: 'gold', amount: r.gold });
    if (r.exp) grantReward({ kind: 'exp', amount: r.exp });
    for (const it of r.items ?? []) {
      grantReward({ kind: 'item', itemId: it.id, quantity: it.qty });
    }
    this.changed();
    return true;
  }

  exportState(): { started: string[]; finished: string[] } {
    return { started: [...this.started], finished: [...this.finished] };
  }

  importState(save: { started: readonly string[]; finished: readonly string[] }): void {
    this.started.clear();
    this.finished.clear();
    for (const id of save.finished) {
      if (id in QUESTS) this.finished.add(id);
    }
    for (const id of save.started) {
      if (id in QUESTS && !this.finished.has(id)) this.started.add(id);
    }
    this.changed();
  }

  snapshot(): QuestSnapshot {
    const quests: QuestView[] = [];
    for (const def of Object.values(QUESTS)) {
      const status = this.status(def.id);
      if (status === 'inactive') continue;
      quests.push({
        id: def.id,
        name: def.name,
        summary: def.summary,
        status,
        objectives: def.objectives.map((o) => {
          const have =
            status === 'completed' ? o.amount : Math.min(character.countItem(o.itemId), o.amount);
          return { label: o.label, have, need: o.amount, done: have >= o.amount };
        }),
      });
    }
    return { quests };
  }

  private changed(): void {
    gameBus.emit('quest:changed', this.snapshot());
  }
}

export const questLog = new QuestLog();
