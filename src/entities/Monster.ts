import Phaser from 'phaser';
import { TILE_SIZE } from '@/config/constants';
import { KNOCKBACK_MS, KNOCKBACK_SPEED } from '@/data/combat';
import type { MonsterDef, MonsterSpawn } from '@/data/monsters';
import { MONSTER_TEXTURE } from '@/world/monsterTexture';

const HIT_FLASH_MS = 100;
const FIRST_ATTACK_DELAY_MS = 800;
const BAR_WIDTH = 14;
const BAR_HEIGHT = 3;
const BAR_OFFSET_Y = 11;

// Monster sederhana: diam sampai Nara mendekat, lalu mengejar dan menyerang
// bila sudah dekat. Teksturnya dibuat lebih dulu lewat ensureMonsterTexture().
export class Monster extends Phaser.Physics.Arcade.Sprite {
  readonly def: MonsterDef;
  readonly spawnId: string;
  hp: number;
  private nextAttackAt: number;
  private stunnedUntil = 0;
  private readonly barBg: Phaser.GameObjects.Rectangle;
  private readonly barFill: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, def: MonsterDef, spawn: MonsterSpawn, now: number) {
    const x = spawn.tileX * TILE_SIZE + TILE_SIZE / 2;
    const y = spawn.tileY * TILE_SIZE + TILE_SIZE / 2;
    super(scene, x, y, MONSTER_TEXTURE);
    this.def = def;
    this.spawnId = spawn.id;
    this.hp = def.maxHp;
    this.nextAttackAt = now + FIRST_ATTACK_DELAY_MS;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setTint(def.tint);
    this.setCollideWorldBounds(true);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(12, 10);
    body.setOffset(1, 2);
    body.setPushable(false);

    this.barBg = scene.add
      .rectangle(x, y - BAR_OFFSET_Y, BAR_WIDTH, BAR_HEIGHT, 0x1a1236)
      .setOrigin(0.5, 0.5)
      .setVisible(false);
    this.barFill = scene.add
      .rectangle(x - BAR_WIDTH / 2, y - BAR_OFFSET_Y, BAR_WIDTH, BAR_HEIGHT, 0xe0735a)
      .setOrigin(0, 0.5)
      .setVisible(false);
    this.syncDepth();
  }

  // Dipanggil tiap frame. Mengembalikan true bila monster menyerang saat ini.
  think(target: Phaser.GameObjects.Sprite, now: number, canHit: boolean): boolean {
    this.syncBar();
    this.syncDepth();
    if (now < this.stunnedUntil) return false;

    const mine = (this.body as Phaser.Physics.Arcade.Body).center;
    const theirs = (target.body as Phaser.Physics.Arcade.Body).center;
    const dist = Phaser.Math.Distance.Between(mine.x, mine.y, theirs.x, theirs.y);

    if (dist <= this.def.attackRange) {
      this.setVelocity(0, 0);
      if (canHit && now >= this.nextAttackAt) {
        this.nextAttackAt = now + this.def.attackCooldownMs;
        return true;
      }
      return false;
    }

    if (dist <= this.def.aggroRadius) {
      this.scene.physics.moveToObject(this, target, this.def.speed);
    } else {
      this.setVelocity(0, 0);
    }
    return false;
  }

  // Mengembalikan true bila monster mati karena pukulan ini.
  takeHit(damage: number, fromX: number, fromY: number, now: number): boolean {
    this.hp = Math.max(0, this.hp - damage);

    const ratio = this.hp / this.def.maxHp;
    this.barBg.setVisible(true);
    this.barFill.setVisible(true);
    this.barFill.setSize(Math.max(1, BAR_WIDTH * ratio), BAR_HEIGHT);

    const away = new Phaser.Math.Vector2(this.x - fromX, this.y - fromY);
    if (away.lengthSq() === 0) away.set(0, 1);
    away.normalize().scale(KNOCKBACK_SPEED);
    this.setVelocity(away.x, away.y);
    this.stunnedUntil = now + KNOCKBACK_MS;

    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(HIT_FLASH_MS, () => {
      if (!this.active) return;
      this.clearTint();
      this.setTint(this.def.tint);
    });
    return this.hp <= 0;
  }

  override destroy(fromScene?: boolean): void {
    this.barBg.destroy();
    this.barFill.destroy();
    super.destroy(fromScene);
  }

  private syncBar(): void {
    this.barBg.setPosition(this.x, this.y - BAR_OFFSET_Y);
    this.barFill.setPosition(this.x - BAR_WIDTH / 2, this.y - BAR_OFFSET_Y);
  }

  private syncDepth(): void {
    this.setDepth(this.y);
    this.barBg.setDepth(this.y + 1);
    this.barFill.setDepth(this.y + 2);
  }
}
