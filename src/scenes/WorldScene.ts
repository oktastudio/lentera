import Phaser from 'phaser';
import { battleManager } from '@/combat/BattleManager';
import type { BattleEndInfo } from '@/combat/TurnBattle';
import { Colors, SceneKeys, TILE_SIZE } from '@/config/constants';
import { bossSpawnsFor, BOSSES, validateBosses } from '@/data/bosses';
import {
  DEFEAT_GOLD_PENALTY,
  PLAYER_ATTACK_COOLDOWN_MS,
  PLAYER_ATTACK_POWER,
  PLAYER_ATTACK_RADIUS,
  PLAYER_ATTACK_RANGE,
} from '@/data/combat';
import { validateDialogues } from '@/data/dialogues';
import { ITEMS } from '@/data/items';
import { MAPS, START_MAP_ID, START_SPAWN_ID } from '@/data/maps';
import { MONSTERS, monsterSpawnsFor, validateMonsters } from '@/data/monsters';
import { npcsFor, validateNpcs } from '@/data/npcs';
import { pickupsFor, validatePickups, type MapPickup, type PickupReward } from '@/data/pickups';
import { validateQuests } from '@/data/quests';
import { validateSkills } from '@/data/skills';
import { BossActor } from '@/entities/BossActor';
import { Monster } from '@/entities/Monster';
import { Npc } from '@/entities/Npc';
import { Player } from '@/entities/Player';
import { character } from '@/systems/CharacterState';
import { calculateDamage, rollChance, rollRange } from '@/systems/Damage';
import { dialogue } from '@/systems/DialogueRunner';
import { gameBus } from '@/systems/EventBus';
import { InputSystem } from '@/systems/InputSystem';
import { grantReward } from '@/systems/Rewards';
import { worldFlags } from '@/systems/WorldFlags';
import { depthOf, ISO_TILE_H, isoBounds, project } from '@/world/iso';
import { BLANK_TEXTURE, isoTileInfo, SHADOW_TEXTURE } from '@/world/isoTextures';
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

type InteractTarget =
  | { readonly kind: 'npc'; readonly npc: Npc }
  | { readonly kind: 'boss'; readonly boss: BossActor };

interface PickupEntry {
  readonly pickup: MapPickup;
  readonly gem: Phaser.GameObjects.Image;
  readonly shadow: Phaser.GameObjects.Image;
}

const FADE_MS = 200;
const DEFEAT_FADE_MS = 500;
const FULL_TOAST_COOLDOWN_MS = 1500;
const INTERACT_RADIUS = 30; // piksel di ruang dunia, jarak Nara ke NPC
const BOSS_INTERACT_RADIUS = 42; // boss bertubuh lebih besar
const MONSTER_HIT_PADDING = 6; // tambahan jangkauan karena tubuh monster punya lebar
const CAMERA_TOP_PADDING = 48; // ruang di atas peta untuk blok yang menjulang
const GROUND_DEPTH = -100000; // semua tile datar selalu di bawah segalanya
const EFFECT_DEPTH = 1000000; // efek dan angka melayang selalu di atas dunia
const LABEL_DEPTH = 1000001;

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

function targetKey(t: InteractTarget | null): string | null {
  if (!t) return null;
  return t.kind === 'npc' ? `npc:${t.npc.def.id}` : `boss:${t.boss.spawnId}`;
}

export class WorldScene extends Phaser.Scene {
  private player!: Player;
  private inputSystem!: InputSystem;
  private mapData!: MapData;
  private spawnId = START_SPAWN_ID;
  private transitioning = false;
  private pickupBlockedUntil = 0;
  private attackReadyAt = 0;
  private npcs: Npc[] = [];
  private nearTarget: InteractTarget | null = null;
  private activeBoss: BossActor | null = null;
  private attackKeys: Phaser.Input.Keyboard.Key[] = [];
  // Array ini dipakai langsung oleh collider, jadi jangan diganti dengan array
  // baru setelah create(); yang mati dihapus dengan splice.
  private monsters: Monster[] = [];
  private bosses: BossActor[] = [];

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
    validateSkills();
    validateBosses(map);
    this.mapData = map;
    this.spawnId = data?.spawnId ?? START_SPAWN_ID;
    this.transitioning = false;
    this.pickupBlockedUntil = 0;
    this.attackReadyAt = 0;
    this.npcs = [];
    this.nearTarget = null;
    this.activeBoss = null;
    this.attackKeys = [];
    this.monsters = [];
    this.bosses = [];
  }

  create(): void {
    const map = this.mapData;
    const rows = map.tiles.length;
    const cols = map.tiles[0].length;
    const worldWidth = cols * TILE_SIZE;
    const worldHeight = rows * TILE_SIZE;

    const walls = this.physics.add.staticGroup();
    this.buildTiles(walls);

    const spawn = map.spawns.find((s) => s.id === this.spawnId);
    if (!spawn) throw new Error(`Spawn "${this.spawnId}" tidak ada di peta "${map.id}"`);

    // Fisika tetap berjalan di ruang dunia (grid persegi); hanya gambarnya isometrik.
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    this.player = new Player(
      this,
      spawn.tileX * TILE_SIZE + TILE_SIZE / 2,
      spawn.tileY * TILE_SIZE + TILE_SIZE / 2,
    );
    this.physics.add.collider(this.player, walls);

    this.spawnNpcs();
    this.spawnMonsters(walls);
    this.spawnBosses();
    this.spawnPickups();

    this.inputSystem = new InputSystem(this);

    // Keyboard untuk desktop: Spasi atau Z untuk menyerang.
    const keyboard = this.input.keyboard;
    if (keyboard) {
      this.attackKeys = [
        keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
        keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
      ];
    }

    // Tombol di UI HTML mengirim event ini. Dilepas saat scene berhenti
    // supaya tidak menumpuk setiap kali pindah peta.
    const offPress = gameBus.on('interact:press', () => {
      this.onInteractPress();
    });
    const offAttack = gameBus.on('attack:press', () => {
      this.performAttack();
    });
    const offBattleEnd = gameBus.on('battle:end', (info) => {
      this.onBattleEnd(info);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offPress();
      offAttack();
      offBattleEnd();
      gameBus.emit('interact:prompt', null);
    });

    const cam = this.cameras.main;
    const bounds = isoBounds(cols, rows, CAMERA_TOP_PADDING);
    cam.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    cam.centerOn(this.player.view.image.x, this.player.view.image.y);
    cam.startFollow(this.player.view.image, true, 0.15, 0.15);
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
      .setDepth(LABEL_DEPTH);
  }

  update(): void {
    const attackPressed = this.consumeAttackKeys();
    if (this.transitioning) return;

    // Nara dan monster diam selama dialog atau pertarungan giliran berlangsung.
    if (dialogue.isActive || battleManager.isActive) {
      this.player.setVelocity(0, 0);
      this.freezeMonsters();
      return;
    }

    this.player.move(this.inputSystem.getDirection());
    if (attackPressed) this.performAttack();

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

  // Menggambar semua tile sebagai berlian, blok, atau benda tegak, dan membuat
  // badan tabrakan tak terlihat untuk tile padat (di ruang dunia).
  private buildTiles(walls: Phaser.Physics.Arcade.StaticGroup): void {
    const map = this.mapData;
    const rows = map.tiles.length;
    const cols = map.tiles[0].length;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const def = TILE_DEFS[map.tiles[r].charAt(c)];
        const info = isoTileInfo(def);
        const corner = project(c * TILE_SIZE, r * TILE_SIZE);
        const centerX = c * TILE_SIZE + TILE_SIZE / 2;
        const centerY = r * TILE_SIZE + TILE_SIZE / 2;
        const depth = depthOf(centerX, centerY);

        switch (info.kind) {
          case 'flat':
            this.add.image(corner.x, corner.y, info.texture).setOrigin(0.5, 0).setDepth(GROUND_DEPTH);
            break;
          case 'block':
            this.add
              .image(corner.x, corner.y - info.height, info.texture)
              .setOrigin(0.5, 0)
              .setDepth(depth);
            break;
          case 'prop':
            if (info.groundTexture) {
              this.add
                .image(corner.x, corner.y, info.groundTexture)
                .setOrigin(0.5, 0)
                .setDepth(GROUND_DEPTH);
            }
            this.add
              .image(corner.x, corner.y + ISO_TILE_H / 2 + 4, info.texture)
              .setOrigin(0.5, 1)
              .setDepth(depth);
            break;
        }

        if (def.solid) {
          const wall = walls.create(centerX, centerY, BLANK_TEXTURE) as Phaser.Physics.Arcade.Sprite;
          wall.setDisplaySize(TILE_SIZE, TILE_SIZE);
          wall.refreshBody();
          wall.setVisible(false);
        }
      }
    }
  }

  private consumeAttackKeys(): boolean {
    let pressed = false;
    for (const key of this.attackKeys) {
      if (Phaser.Input.Keyboard.JustDown(key)) pressed = true;
    }
    return pressed;
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

  private spawnBosses(): void {
    const spawns = bossSpawnsFor(this.mapData.id);
    if (spawns.length === 0) return;
    ensureMonsterTexture(this);
    for (const s of spawns) {
      if (worldFlags.isBossDefeated(this.mapData.id, s.id)) continue;
      this.bosses.push(new BossActor(this, BOSSES[s.bossId], s));
    }
    if (this.bosses.length === 0) return;
    this.physics.add.collider(this.player, this.bosses);
    if (this.monsters.length > 0) this.physics.add.collider(this.monsters, this.bosses);
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

  private performAttack(): void {
    if (this.transitioning || dialogue.isActive || battleManager.isActive) return;
    const now = this.time.now;
    if (now < this.attackReadyAt) return;
    this.attackReadyAt = now + PLAYER_ATTACK_COOLDOWN_MS;

    // Area pukulan dihitung di ruang dunia, di depan arah hadap Nara.
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const cx = body.center.x + this.player.facing.x * PLAYER_ATTACK_RANGE;
    const cy = body.center.y + this.player.facing.y * PLAYER_ATTACK_RANGE;
    this.slashEffect(cx, cy);

    const attack = character.getStats().attack;
    for (const m of [...this.monsters]) {
      const mb = m.body as Phaser.Physics.Arcade.Body;
      const dist = Phaser.Math.Distance.Between(cx, cy, mb.center.x, mb.center.y);
      if (dist > PLAYER_ATTACK_RADIUS + MONSTER_HIT_PADDING) continue;

      const damage = calculateDamage(attack, m.def.defense, PLAYER_ATTACK_POWER);
      this.floatText(m.x, m.y, String(damage), '#ffffff', 16);
      if (m.takeHit(damage, this.player.x, this.player.y, now)) this.killMonster(m);
    }
  }

  private killMonster(m: Monster): void {
    const index = this.monsters.indexOf(m);
    if (index >= 0) this.monsters.splice(index, 1);

    const def = m.def;
    const parts: string[] = [`+${def.expReward} EXP`];

    const gold = rollRange(def.gold.min, def.gold.max);
    character.addGold(gold);
    parts.push(`+${gold} G`);

    for (const drop of def.drops) {
      if (!rollChance(drop.chance)) continue;
      if (character.addItem(drop.itemId, drop.quantity)) {
        parts.push(ITEMS[drop.itemId].name);
      } else {
        parts.push('Inventori penuh');
      }
    }

    gameBus.emit('toast', `${def.name} kalah: ${parts.join(', ')}`);
    character.addExp(def.expReward);

    this.puffEffect(m.x, m.y, def.tint);
    m.destroy();
  }

  private hitPlayer(monster: Monster): void {
    const damage = calculateDamage(monster.def.attack, character.getStats().defense);
    this.floatText(this.player.x, this.player.y, `-${damage}`, '#ff8a7a', 22);
    this.player.hurt(monster.x, monster.y);
    if (character.takeDamage(damage)) this.handleDefeat();
  }

  private handleDefeat(): void {
    this.transitioning = true;
    this.player.setVelocity(0, 0);
    this.freezeMonsters();
    this.nearTarget = null;
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

  // Dipanggil setelah layar pertarungan giliran ditutup.
  private onBattleEnd(info: BattleEndInfo): void {
    const boss = this.activeBoss;
    this.activeBoss = null;
    this.nearTarget = null; // supaya tombol aksi dihitung ulang

    if (info.outcome === 'defeat') {
      this.handleDefeat();
      return;
    }

    if (info.outcome === 'victory' && boss) {
      worldFlags.defeatBoss(this.mapData.id, boss.spawnId);
      const index = this.bosses.indexOf(boss);
      if (index >= 0) this.bosses.splice(index, 1);
      this.puffEffect(boss.x, boss.y, boss.def.tint);
      boss.destroy();
      gameBus.emit('interact:prompt', null);
    }
  }

  // Elips cahaya singkat di area pukulan (lingkaran di dunia = elips di layar).
  private slashEffect(wx: number, wy: number): void {
    const p = project(wx, wy);
    const ring = this.add
      .ellipse(
        p.x,
        p.y - 4,
        PLAYER_ATTACK_RADIUS * Math.SQRT2,
        PLAYER_ATTACK_RADIUS * Math.SQRT1_2,
        0xfff3b0,
        0.45,
      )
      .setDepth(EFFECT_DEPTH);
    this.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 1.4,
      duration: 150,
      onComplete: () => {
        ring.destroy();
      },
    });
  }

  // Kepulan kecil saat monster atau boss kalah.
  private puffEffect(wx: number, wy: number, color: number): void {
    const p = project(wx, wy);
    const puff = this.add.circle(p.x, p.y - 6, 8, color, 0.8).setDepth(EFFECT_DEPTH);
    this.tweens.add({
      targets: puff,
      alpha: 0,
      scale: 2.2,
      duration: 250,
      onComplete: () => {
        puff.destroy();
      },
    });
  }

  // Teks angka melayang naik lalu hilang. Posisi diberikan di ruang dunia;
  // lift = seberapa tinggi di atas titik pijak (piksel layar).
  private floatText(wx: number, wy: number, text: string, color: string, lift = 18): void {
    const p = project(wx, wy);
    const y = p.y - lift;
    const label = this.add
      .text(p.x, y, text, { fontFamily: 'monospace', fontSize: '8px', color })
      .setOrigin(0.5, 1)
      .setDepth(EFFECT_DEPTH);
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

  // Mencari NPC atau boss terdekat yang cukup dekat untuk diajak berinteraksi.
  private findTarget(): InteractTarget | null {
    let found: InteractTarget | null = null;
    let bestDist = Infinity;

    for (const npc of this.npcs) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y);
      if (d <= INTERACT_RADIUS && d < bestDist) {
        bestDist = d;
        found = { kind: 'npc', npc };
      }
    }
    for (const boss of this.bosses) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, boss.x, boss.y);
      if (d <= BOSS_INTERACT_RADIUS && d < bestDist) {
        bestDist = d;
        found = { kind: 'boss', boss };
      }
    }
    return found;
  }

  private updateInteractPrompt(): void {
    const target = this.findTarget();
    if (targetKey(target) === targetKey(this.nearTarget)) return;
    this.nearTarget = target;
    if (!target) {
      gameBus.emit('interact:prompt', null);
    } else {
      gameBus.emit('interact:prompt', target.kind === 'npc' ? 'Bicara' : 'Tantang');
    }
  }

  private onInteractPress(): void {
    if (this.transitioning || dialogue.isActive || battleManager.isActive) return;
    const target = this.nearTarget;
    if (!target) return;

    this.player.setVelocity(0, 0);
    if (target.kind === 'npc') {
      dialogue.startForNpc(target.npc.def);
    } else {
      this.activeBoss = target.boss;
      battleManager.start(target.boss.def);
    }
  }

  private spawnPickups(): void {
    ensurePickupTexture(this);
    const group = this.physics.add.group({ allowGravity: false });
    const entries = new Map<Phaser.GameObjects.GameObject, PickupEntry>();

    for (const p of pickupsFor(this.mapData.id)) {
      if (worldFlags.isPickupCollected(this.mapData.id, p.id)) continue;

      const x = p.tileX * TILE_SIZE + TILE_SIZE / 2;
      const y = p.tileY * TILE_SIZE + TILE_SIZE / 2;

      // Badan logika (untuk tabrakan) tidak terlihat; yang terlihat permata
      // melayang dan bayangannya di posisi hasil proyeksi.
      const sprite = group.create(x, y, PICKUP_TEXTURE) as Phaser.Physics.Arcade.Sprite;
      sprite.setVisible(false);
      (sprite.body as Phaser.Physics.Arcade.Body).setSize(24, 24, true);

      const pt = project(x, y);
      const depth = depthOf(x, y);
      const shadow = this.add
        .image(pt.x, pt.y + 1, SHADOW_TEXTURE)
        .setScale(0.7)
        .setDepth(depth);
      const gem = this.add
        .image(pt.x, pt.y - 2, PICKUP_TEXTURE)
        .setOrigin(0.5, 1)
        .setTint(tintFor(p.reward))
        .setDepth(depth + 1);
      this.tweens.add({
        targets: gem,
        y: gem.y - 3,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      entries.set(sprite, { pickup: p, gem, shadow });
    }

    this.physics.add.overlap(this.player, group, (_player, obj) => {
      if (this.time.now < this.pickupBlockedUntil) return;
      const sprite = obj as Phaser.Physics.Arcade.Sprite;
      const entry = entries.get(sprite);
      if (!entry) return;

      if (!grantReward(entry.pickup.reward)) {
        this.pickupBlockedUntil = this.time.now + FULL_TOAST_COOLDOWN_MS;
        return;
      }
      worldFlags.collectPickup(this.mapData.id, entry.pickup.id);
      entries.delete(sprite);
      this.tweens.killTweensOf(entry.gem);
      entry.gem.destroy();
      entry.shadow.destroy();
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
    this.nearTarget = null;
    gameBus.emit('interact:prompt', null);
    const cam = this.cameras.main;
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.restart({ mapId: exit.toMap, spawnId: exit.toSpawn } satisfies WorldInitData);
    });
    cam.fadeOut(FADE_MS, 11, 8, 32);
  }
}
