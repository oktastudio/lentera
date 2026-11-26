import { DIALOGUES, type DialogueNode } from '@/data/dialogues';
import type { NpcDef } from '@/data/npcs';
import { gameBus } from '@/systems/EventBus';
import { questLog } from '@/systems/QuestLog';

// Yang dikirim ke UI untuk digambar. choices kosong = ketuk untuk lanjut.
export interface DialogueView {
  readonly speaker: string;
  readonly text: string;
  readonly choices: readonly string[];
}

// Mesin dialog tanpa tampilan: memilih dialog sesuai status quest,
// menjalankan efek, lalu memberi tahu UI lewat event.
class DialogueRunner {
  private current: DialogueNode | null = null;

  get isActive(): boolean {
    return this.current !== null;
  }

  startForNpc(npc: NpcDef): void {
    if (this.current) return;
    const rule = npc.rules.find(
      (r) => r.quest === undefined || questLog.status(r.quest.id) === r.quest.status,
    );
    if (!rule) return;
    this.enter(rule.start);
  }

  // Dipanggil saat kotak dialog diketuk dan node tidak punya pilihan.
  advance(): void {
    const node = this.current;
    if (!node || node.choices) return;
    if (node.next) this.enter(node.next);
    else this.end();
  }

  choose(index: number): void {
    const node = this.current;
    const choice = node?.choices?.[index];
    if (!node || !choice) return;
    if (choice.next) this.enter(choice.next);
    else this.end();
  }

  private enter(nodeId: string): void {
    const node = DIALOGUES[nodeId] as DialogueNode | undefined;
    if (!node) {
      this.end();
      return;
    }
    this.current = node;

    for (const effect of node.effects ?? []) {
      switch (effect.kind) {
        case 'startQuest':
          questLog.start(effect.questId);
          break;
        case 'completeQuest':
          questLog.complete(effect.questId);
          break;
      }
    }

    gameBus.emit('dialogue:show', {
      speaker: node.speaker,
      text: node.text,
      choices: (node.choices ?? []).map((c) => c.label),
    });
  }

  private end(): void {
    this.current = null;
    gameBus.emit('dialogue:end', null);
  }
}

export const dialogue = new DialogueRunner();
