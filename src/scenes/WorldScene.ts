import Phaser from 'phaser';
import { Colors, SceneKeys, TILE_SIZE } from '@/config/constants';
import { ITEMS } from '@/data/items';
import { MAPS, START_MAP_ID, START_SPAWN_ID } from '@/data/maps';
import { pickupsFor, validatePickups, type MapPickup, type PickupReward } from '@/data/pickups';
import { Player } from '@/entities/Player';
import { InputSystem } from '@/systems/InputSystem';
import { grantReward } from '@/systems/Rewards';
import { worldFlags } from '@/systems/WorldFlags';
import { PICKUP_TEXTURE, ensurePickupTexture } from '@/world/pickupTexture';
import { TILE_DEFS } from '@/world/tiles';
import type { MapData, MapExit } from '@/world/types';
import { validateMap } from '@/world/validateMap';

interface WorldInitData {
  mapId?: string;
  spawnId?: string;
}

const FADE_MS = 200;
const FULL_TOAST_COOLDOWN_MS = 1500;

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

  constructor() {
    super(SceneKeys.World);
  }

  init(data?: WorldInitData): void {
    const mapId = data?.mapId ?? START_MAP_ID;
    const map = MAPS[mapId] as MapData | undefined;
    if (!map) throw new Error(`Peta "${mapId}" tidak terdaftar`);
    validateMap(map);
    validatePickups(map);
    this.mapData = map;
    this.spawnId = data?.spawnId ?? START_SPAWN_ID;
    this.transitioning = false;
    this.pickupBlockedUntil = 0;
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

    this.spawnPickups();

    this.inputSystem = new InputSystem(this);

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

    this.player.move(this.inputSystem.getDirection());

    const tileX = Math.floor(this.player.x / TILE_SIZE);
    const tileY = Math.floor(this.player.y / TILE_SIZE);
    const exit = this.mapData.exits.find((e) => this.isInside(e, tileX, tileY));
    if (exit) this.goTo(exit);
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
    const cam = this.cameras.main;
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.restart({ mapId: exit.toMap, spawnId: exit.toSpawn } satisfies WorldInitData);
    });
    cam.fadeOut(FADE_MS, 11, 8, 32);
  }
}
