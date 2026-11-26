import Phaser from 'phaser';
import { Colors, SceneKeys, TILE_SIZE } from '@/config/constants';
import { DEFEAT_GOLD_PENALTY } from '@/data/combat';
import { validateDialogues } from '@/data/dialogues';
import { ITEMS } from '@/data/items';
import { MAPS, START_MAP_ID, START_SPAWN_ID } from '@/data/maps';
import { MONSTERS, monsterSpawnsFor, validateMonsters } from '@/data/monsters';
import { npcsFor, validateNpcs } from '@/data/npcs';
import { pickupsFor, validatePickups, type MapPickup, type PickupReward } from '@/data/pickups';
import { validateQuests } from '@/data/quests';
import { Monster } from '@/entities/Monster';
import { Npc } from '@/entities/Npc';
import { Player } from '@/entities/Player';
import { character } from '@/systems/CharacterState';
import { calculateDamage } from '@/systems/Damage';
import { dialogue } from '@/systems/DialogueRunner';
import { gameBus } from '@/systems/EventBus';
import { InputSystem } from '@/systems/InputSystem';
import { grantReward } from '@/systems/Rewards';
import { worldFlags } from '@/systems/WorldFlags';
import { ensureMonsterTexture } from '@/world/monsterTexture';
import { ensureNpcTexture } from '@/world/npcTexture';
import { PICKUP_TEXTURE, ensurePickupTexture } from '@/world/pickupTexture';
import { TILE_DEFS } from '@/world/tiles';
import type { MapData, MapExit } from '@/world/types';
import { validateMap } from '@/world/validateMap';

interface WorldInitData {
  mapId?: string;
  spawnId?: string;
}

const FADE_MS = 200;
const DEFEAT_FADE_MS = 500;
const FULL_TOAST_COOLDOWN_MS = 1500;
const INTERACT_RADIUS = 30; // piksel, jarak pusat Nara ke pusat NPC

function tintFor(reward: PickupReward): number {
  switch (reward.kind) {
    case 'gold':
      return 0xffc857;
    case 'exp':
      return 0xb86fd1;
    case 'item':
      return Phaser.Display.Color.HexStringToColor(ITEMS[reward.itemId].color).color;
  }
}

export class WorldScene extends Phaser.Scene {
  private player!: Player;
  private inputSystem!: InputSystem;
  private mapData!: MapData;
  private spawnId = START_SPAWN_ID;
  private transitioning = false;
  private pickupBlockedUntil = 0;
  private npcs: Npc[] = [];
  private nearNpc: Npc | null = null;
  // Array ini dipakai langsung oleh collider, jadi jangan diganti dengan array
  // baru setelah create(); monster yang mati dihapus dengan splice.
  private monsters: Monster[] = [];

  constructor() {
    super(SceneKeys.World);
  }

  init(data?: WorldInitData): void {
    const mapId = data?.mapId ?? START_MAP_ID;
    const map = MAPS[mapId] as MapData | undefined;
    if (!map) throw new Error(`Peta "${mapId}" tidak terdaftar`);
    validateMap(map);
    validatePickups(map);
    validateQuests();
    validateDialogues();
    validateNpcs(map);
    validateMonsters(map);
    this.mapData = map;
    this.spawnId = data?.spawnId ?? START_SPAWN_ID;
    this.transitioning = false;
    this.pickupBlockedUntil = 0;
    this.npcs = [];
    this.nearNpc = null;
    this.monsters = [];
  }

  create(): void {
    const map = this.mapData;
    const rows = map.tiles.length;
    const cols = map.tiles[0].length;
    const worldWidth = cols * TILE_SIZE;
    const worldHeight = rows * TILE_SIZE;

    const walls = this.physics.add.staticGroup();

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const def = TILE_DEFS[map.tiles[r].charAt(c)];
        const x = c * TILE_SIZE;
        const y = r * TILE_SIZE;
        if (def.solid) {
          walls.create(x + TILE_SIZE / 2, y + TILE_SIZE / 2, def.key);
        } else {
          this.add.image(x, y, def.key).setOrigin(0, 0);
        }
      }
    }

    const spawn = map.spawns.find((s) => s.id === this.spawnId);
    if (!spawn) throw new Error(`Spawn "${this.spawnId}" tidak ada di peta "${map.id}"`);

    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    this.player = new Player(
      this,
      spawn.tileX * TILE_SIZE + TILE_SIZE / 2,
      spawn.tileY * TILE_SIZE + TILE_SIZE / 2,
    );
    this.physics.add.collider(this.player, walls);

    this.spawnNpcs();
    this.spawnMonsters(walls);
    this.spawnPickups();

    this.inputSystem = new InputSystem(this);

    // Tombol aksi di UI HTML mengirim event ini. Dilepas saat scene berhenti
    // supaya tidak menumpuk setiap kali pindah peta.
    const offPress = gameBus.on('interact:press', () => {
      this.onInteractPress();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offPress();
      gameBus.emit('interact:prompt', null);
    });

    const cam = this.cameras.main;
    cam.setBounds(0, 0, worldWidth, worldHeight);
    cam.startFollow(this.player, true, 0.15, 0.15);
    cam.roundPixels = true;
    cam.setBackgroundColor(Colors.background);
    cam.fadeIn(FADE_MS, 11, 8, 32);

    this.add
      .text(4, 4, map.name, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#fff3b0',
      })
      .setScrollFactor(0)
      .setDepth(100);
  }

  update(): void {
    if (this.transitioning) return;

    // Nara dan monster diam selama dialog berlangsung.
    if (dialogue.isActive) {
      this.player.setVelocity(0, 0);
      this.freezeMonsters();
      return;
    }

    this.player.move(this.inputSystem.getDirection());

    const tileX = Math.floor(this.player.x / TILE_SIZE);
    const tileY = Math.floor(this.player.y / TILE_SIZE);
    const exit = this.mapData.exits.find((e) => this.isInside(e, tileX, tileY));
    if (exit) {
      this.goTo(exit);
      return;
    }

    this.updateMonsters();
    if (this.transitioning) return;

    this.updateInteractPrompt();
  }

  private spawnNpcs(): void {
    const defs = npcsFor(this.mapData.id);
    if (defs.length === 0) return;
    ensureNpcTexture(this);
    for (const def of defs) this.npcs.push(new Npc(this, def));
    this.physics.add.collider(this.player, this.npcs);
  }

  private spawnMonsters(walls: Phaser.Physics.Arcade.StaticGroup): void {
    const spawns = monsterSpawnsFor(this.mapData.id);
    if (spawns.length === 0) return;
    ensureMonsterTexture(this);
    const now = this.time.now;
    for (const s of spawns) {
      this.monsters.push(new Monster(this, MONSTERS[s.monsterId], s, now));
    }
    this.physics.add.collider(this.monsters, walls);
    this.physics.add.collider(this.monsters, this.monsters);
    this.physics.add.collider(this.player, this.monsters);
    if (this.npcs.length > 0) this.physics.add.collider(this.monsters, this.npcs);
  }

  private updateMonsters(): void {
    const now = this.time.now;
    for (const m of this.monsters) {
      if (m.think(this.player, now, !this.player.isInvulnerable())) {
        this.hitPlayer(m);
        if (this.transitioning) return;
      }
    }
  }

  private freezeMonsters(): void {
    for (const m of this.monsters) m.setVelocity(0, 0);
  }

  private hitPlayer(monster: Monster): void {
    const damage = calculateDamage(monster.def.attack, character.getStats().defense);
    this.floatText(this.player.x, this.player.y - 12, `-${damage}`, '#ff8a7a');
    this.player.hurt(monster.x, monster.y);
    if (character.takeDamage(damage)) this.handleDefeat();
  }

  private handleDefeat(): void {
    this.transitioning = true;
    this.player.setVelocity(0, 0);
    this.freezeMonsters();
    this.nearNpc = null;
    gameBus.emit('interact:prompt', null);

    const mapId = this.mapData.id;
    const spawnId = this.mapData.spawns[0].id;
    const cam = this.cameras.main;
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const lost = character.reviveAfterDefeat(DEFEAT_GOLD_PENALTY);
      gameBus.emit('toast', lost > 0 ? `Nara kalah... -${lost} G` : 'Nara kalah...');
      this.scene.restart({ mapId, spawnId } satisfies WorldInitData);
    });
    cam.fadeOut(DEFEAT_FADE_MS, 11, 8, 32);
  }

  // Teks angka melayang naik lalu hilang.
  private floatText(x: number, y: number, text: string, color: string): void {
    const label = this.add
      .text(x, y, text, { fontFamily: 'monospace', fontSize: '8px', color })
      .setOrigin(0.5, 1)
      .setDepth(100000);
    this.tweens.add({
      targets: label,
      y: y - 14,
      alpha: 0,
      duration: 600,
      onComplete: () => {
        label.destroy();
      },
    });
  }

  private updateInteractPrompt(): void {
    let nearest: Npc | null = null;
    let best = INTERACT_RADIUS;
    for (const npc of this.npcs) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y);
      if (d <= best) {
        best = d;
        nearest = npc;
      }
    }
    if (nearest !== this.nearNpc) {
      this.nearNpc = nearest;
      gameBus.emit('interact:prompt', nearest ? 'Bicara' : null);
    }
  }

  private onInteractPress(): void {
    if (this.transitioning || dialogue.isActive || !this.nearNpc) return;
    this.player.setVelocity(0, 0);
    dialogue.startForNpc(this.nearNpc.def);
  }

  private spawnPickups(): void {
    ensurePickupTexture(this);
    const group = this.physics.add.group({ allowGravity: false });
    const entries = new Map<Phaser.GameObjects.GameObject, MapPickup>();

    for (const p of pickupsFor(this.mapData.id)) {
      if (worldFlags.isPickupCollected(this.mapData.id, p.id)) continue;

      const x = p.tileX * TILE_SIZE + TILE_SIZE / 2;
      const y = p.tileY * TILE_SIZE + TILE_SIZE / 2;
      const sprite = group.create(x, y, PICKUP_TEXTURE) as Phaser.Physics.Arcade.Sprite;
      sprite.setTint(tintFor(p.reward));
      sprite.setDepth(y);
      (sprite.body as Phaser.Physics.Arcade.Body).setSize(24, 24, true);
      entries.set(sprite, p);

      this.tweens.add({
        targets: sprite,
        y: y - 3,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    this.physics.add.overlap(this.player, group, (_player, obj) => {
      if (this.time.now < this.pickupBlockedUntil) return;
      const sprite = obj as Phaser.Physics.Arcade.Sprite;
      const pickup = entries.get(sprite);
      if (!pickup) return;

      if (!grantReward(pickup.reward)) {
        this.pickupBlockedUntil = this.time.now + FULL_TOAST_COOLDOWN_MS;
        return;
      }
      worldFlags.collectPickup(this.mapData.id, pickup.id);
      entries.delete(sprite);
      this.tweens.killTweensOf(sprite);
      sprite.destroy();
    });
  }

  private isInside(e: MapExit, tileX: number, tileY: number): boolean {
    return (
      tileX >= e.tileX &&
      tileX < e.tileX + e.widthTiles &&
      tileY >= e.tileY &&
      tileY < e.tileY + e.heightTiles
    );
  }

  private goTo(exit: MapExit): void {
    this.transitioning = true;
    this.player.setVelocity(0, 0);
    this.freezeMonsters();
    this.nearNpc = null;
    gameBus.emit('interact:prompt', null);
    const cam = this.cameras.main;
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.restart({ mapId: exit.toMap, spawnId: exit.toSpawn } satisfies WorldInitData);
    });
    cam.fadeOut(FADE_MS, 11, 8, 32);
  }
}
