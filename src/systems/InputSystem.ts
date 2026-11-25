import Phaser from 'phaser';
import { Colors, GAME_WIDTH } from '@/config/constants';

const JOY_RADIUS = 24;
const JOY_DEAD_ZONE = 4;
const JOY_ZONE_RATIO = 0.6; // joystick aktif di 60% layar bagian kiri

type WasdKeys = Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

// Keyboard (panah / WASD) untuk desktop, joystick sentuh melayang untuk HP.
export class InputSystem {
  private readonly direction = new Phaser.Math.Vector2(0, 0);
  private readonly joyOrigin = new Phaser.Math.Vector2(0, 0);
  private readonly joyVector = new Phaser.Math.Vector2(0, 0);
  private readonly stick: Phaser.GameObjects.Graphics;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasd: WasdKeys | null = null;
  private joyPointerId: number | null = null;

  constructor(private readonly scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;
    if (keyboard) {
      this.cursors = keyboard.createCursorKeys();
      this.wasd = keyboard.addKeys('W,A,S,D') as WasdKeys;
    }

    this.stick = scene.add.graphics().setScrollFactor(0).setDepth(100000);

    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('pointerupoutside', this.onUp, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  getDirection(): Phaser.Math.Vector2 {
    let x = 0;
    let y = 0;

    if (this.cursors) {
      if (this.cursors.left.isDown) x -= 1;
      if (this.cursors.right.isDown) x += 1;
      if (this.cursors.up.isDown) y -= 1;
      if (this.cursors.down.isDown) y += 1;
    }
    if (this.wasd) {
      if (this.wasd.A.isDown) x -= 1;
      if (this.wasd.D.isDown) x += 1;
      if (this.wasd.W.isDown) y -= 1;
      if (this.wasd.S.isDown) y += 1;
    }

    if (x !== 0 || y !== 0) {
      return this.direction.set(x, y).normalize();
    }
    return this.direction.copy(this.joyVector);
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (this.joyPointerId !== null) return;
    if (pointer.x > GAME_WIDTH * JOY_ZONE_RATIO) return;
    this.joyPointerId = pointer.id;
    this.joyOrigin.set(pointer.x, pointer.y);
    this.joyVector.set(0, 0);
    this.draw();
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.joyPointerId) return;
    const dx = pointer.x - this.joyOrigin.x;
    const dy = pointer.y - this.joyOrigin.y;
    const len = Math.hypot(dx, dy);

    if (len < JOY_DEAD_ZONE) {
      this.joyVector.set(0, 0);
    } else {
      const clamped = Math.min(len, JOY_RADIUS) / JOY_RADIUS;
      this.joyVector.set((dx / len) * clamped, (dy / len) * clamped);
    }
    this.draw();
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.joyPointerId) return;
    this.joyPointerId = null;
    this.joyVector.set(0, 0);
    this.draw();
  }

  private draw(): void {
    this.stick.clear();
    if (this.joyPointerId === null) return;
    const { x, y } = this.joyOrigin;
    this.stick.lineStyle(1, Colors.lantern, 0.5);
    this.stick.strokeCircle(x, y, JOY_RADIUS);
    this.stick.fillStyle(Colors.lantern, 0.6);
    this.stick.fillCircle(x + this.joyVector.x * JOY_RADIUS, y + this.joyVector.y * JOY_RADIUS, 6);
  }

  private destroy(): void {
    this.scene.input.off('pointerdown', this.onDown, this);
    this.scene.input.off('pointermove', this.onMove, this);
    this.scene.input.off('pointerup', this.onUp, this);
    this.scene.input.off('pointerupoutside', this.onUp, this);
    this.stick.destroy();
  }
}
