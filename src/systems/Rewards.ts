import { ITEMS } from '@/data/items';
import type { PickupReward } from '@/data/pickups';
import { character } from '@/systems/CharacterState';
import { gameBus } from '@/systems/EventBus';

// Mengembalikan false bila hadiah tidak bisa diterima (inventori penuh).
export function grantReward(reward: PickupReward): boolean {
  switch (reward.kind) {
    case 'gold':
      gameBus.emit('toast', `+${reward.amount} G`);
      character.addGold(reward.amount);
      return true;
    case 'exp':
      gameBus.emit('toast', `+${reward.amount} EXP`);
      character.addExp(reward.amount);
      return true;
    case 'item': {
      if (!character.addItem(reward.itemId, reward.quantity)) {
        gameBus.emit('toast', 'Inventori penuh');
        return false;
      }
      const name = ITEMS[reward.itemId].name;
      gameBus.emit('toast', reward.quantity > 1 ? `${name} x${reward.quantity}` : name);
      return true;
    }
  }
}
