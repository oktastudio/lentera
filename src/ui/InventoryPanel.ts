import { ITEMS, SLOT_LABELS, type EquipSlot } from '@/data/items';
import {
  INVENTORY_CAPACITY,
  character,
  type CharacterSnapshot,
} from '@/systems/CharacterState';
import { gameBus } from '@/systems/EventBus';
import { el } from '@/ui/dom';

const SLOT_ORDER: readonly EquipSlot[] = ['weapon', 'armor', 'charm'];

function icon(color: string | null): HTMLSpanElement {
  const node = el('span', 'icon');
  node.style.background = color ?? 'transparent';
  if (!color) node.style.borderStyle = 'dashed';
  return node;
}

export class InventoryPanel {
  readonly root = el('div', 'panel-backdrop');
  private readonly body = el('div', 'panel-body');
  private selected: number | null = null;
  private isOpen = false;

  constructor(private readonly onToggle: (open: boolean) => void) {
    const panel = el('div', 'panel');
    const head = el('div', 'panel-head');
    const close = el('button', 'btn', 'Tutup');
    close.type = 'button';
    close.addEventListener('click', () => {
      this.close();
    });
    head.append(el('span', 'panel-title', 'Tas Nara'), close);
    panel.append(head, this.body);
    this.root.append(panel);

    // Tap area gelap di luar panel = tutup.
    this.root.addEventListener('click', (e) => {
      if (e.target === this.root) this.close();
    });

    gameBus.on('character:changed', (s) => {
      if (this.isOpen) this.render(s);
    });
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.selected = null;
    this.root.classList.add('open');
    this.render(character.snapshot());
    this.onToggle(true);
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.root.classList.remove('open');
    this.onToggle(false);
  }

  private render(s: CharacterSnapshot): void {
    if (this.selected !== null && this.selected >= s.inventory.length) {
      this.selected = null;
    }
    const left = el('div', 'panel-col');
    left.append(this.renderStats(s), this.renderEquipment(s));
    const right = el('div', 'panel-col');
    right.append(this.renderGrid(s), this.renderDetail(s));
    this.body.replaceChildren(left, right);
  }

  private renderStats(s: CharacterSnapshot): HTMLElement {
    const box = el('div', 'panel-col');
    box.append(el('div', 'section-title', 'Status'));
    const list = el('div', 'stat-list');
    const rows: ReadonlyArray<readonly [string, string]> = [
      ['Level', String(s.level)],
      ['Gold', String(s.gold)],
      ['HP maks', String(s.stats.maxHp)],
      ['MP maks', String(s.stats.maxMp)],
      ['Serangan', String(s.stats.attack)],
      ['Pertahanan', String(s.stats.defense)],
    ];
    for (const [label, value] of rows) {
      list.append(el('span', undefined, label), el('span', undefined, value));
    }
    box.append(list);
    return box;
  }

  private renderEquipment(s: CharacterSnapshot): HTMLElement {
    const box = el('div', 'panel-col');
    box.append(el('div', 'section-title', 'Perlengkapan (tap untuk lepas)'));
    for (const slotName of SLOT_ORDER) {
      const itemId = s.equipment[slotName];
      const def = itemId ? ITEMS[itemId] : null;
      const row = el('button', 'equip-row');
      row.type = 'button';
      row.disabled = !def;
      row.append(
        el('span', 'equip-slot-name', SLOT_LABELS[slotName]),
        icon(def ? def.color : null),
        el('span', undefined, def ? def.name : '-'),
      );
      row.addEventListener('click', () => {
        character.unequip(slotName);
      });
      box.append(row);
    }
    return box;
  }

  private renderGrid(s: CharacterSnapshot): HTMLElement {
    const box = el('div', 'panel-col');
    box.append(
      el('div', 'section-title', `Inventori ${s.inventory.length}/${INVENTORY_CAPACITY}`),
    );
    const grid = el('div', 'inv-grid');
    for (let i = 0; i < INVENTORY_CAPACITY; i++) {
      const slot = el('button', 'slot');
      slot.type = 'button';
      const data = s.inventory.at(i);
      if (!data) {
        slot.disabled = true;
      } else {
        slot.append(icon(ITEMS[data.itemId].color));
        if (data.quantity > 1) slot.append(el('span', 'slot-qty', String(data.quantity)));
        if (this.selected === i) slot.classList.add('selected');
        slot.addEventListener('click', () => {
          this.selected = i;
          this.render(character.snapshot());
        });
      }
      grid.append(slot);
    }
    box.append(grid);
    return box;
  }

  private renderDetail(s: CharacterSnapshot): HTMLElement {
    const box = el('div', 'detail');
    const index = this.selected;
    const data = index === null ? undefined : s.inventory.at(index);
    if (index === null || !data) {
      box.append(el('div', 'detail-desc', 'Pilih benda untuk melihat detailnya.'));
      return box;
    }

    const def = ITEMS[data.itemId];
    box.append(el('div', 'detail-name', def.name), el('div', 'detail-desc', def.description));

    const actions = el('div', 'detail-actions');
    if (def.type === 'consumable') {
      const use = el('button', 'btn', 'Pakai');
      use.type = 'button';
      use.addEventListener('click', () => {
        character.useItem(index);
      });
      actions.append(use);
    } else if (def.type === 'equipment') {
      const equip = el('button', 'btn', 'Pasang');
      equip.type = 'button';
      equip.addEventListener('click', () => {
        this.selected = null;
        character.equipFromInventory(index);
      });
      actions.append(equip);
    }
    box.append(actions);
    return box;
  }
}
