import Phaser from 'phaser';
import { SceneKeys, TextureKeys, TILE_SIZE } from '@/config/constants';
import { TEST_MAP, TEST_MAP_SPAWN_CHAR } from '@/data/testMap';
import { Player } from '@/entities/Player';
import { InputSystem } from '@/systems/InputSystem';

export class WorldScene extends Phaser.Scene {
  private player!: Player;
  private inputSystem!: InputSystem;

  constructor() {
    super(SceneKeys.World);
  }

  create(): void {
    const rows = TEST_MAP.length;
    const cols = TEST_MAP[0].length;
    const worldWidth = cols * TILE_SIZE;
    const worldHeight = rows * TILE_SIZE;

    const walls = this.physics.add.staticGroup();
    let spawnX = TILE_SIZE * 2;
    let spawnY = TILE_SIZE * 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const ch = TEST_MAP[r].charAt(c);
        const x = c * TILE_SIZE;
        const y = r * TILE_SIZE;

        const groundKey = (r + c) % 2 === 0 ? TextureKeys.TileGround : TextureKeys.TileGroundAlt;
        this.add.image(x, y, groundKey).setOrigin(0, 0);

        if (ch === '#') {
          walls.create(x + TILE_SIZE / 2, y + TILE_SIZE / 2, TextureKeys.TileWall);
        } else if (ch === TEST_MAP_SPAWN_CHAR) {
          spawnX = x + TILE_SIZE / 2;
          spawnY = y + TILE_SIZE / 2;
        }
      }
    }

    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    this.player = new Player(this, spawnX, spawnY);
    this.physics.add.collider(this.player, walls);

    this.inputSystem = new InputSystem(this);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, worldWidth, worldHeight);
    cam.startFollow(this.player, true, 0.15, 0.15);
    cam.roundPixels = true;

    this.add
      .text(4, 4, 'LENTERA - Fase 0', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#fff3b0',
      })
      .setScrollFactor(0)
      .setDepth(100);
  }

  update(): void {
    this.player.move(this.inputSystem.getDirection());
  }
}
