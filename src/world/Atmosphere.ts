import Phaser from 'phaser';

// Suasana dunia LENTERA: cahaya lentera Nara, cahaya lampu jalan, tepi layar
// yang menggelap (vinyet), dan titik-titik cahaya yang melayang pelan.
// Semuanya dibuat dari kode, tanpa file gambar.

export const GLOW_TEXTURE = 'tex-glow';
export const MOTE_TEXTURE = 'tex-mote';
export const VIGNETTE_TEXTURE = 'tex-vignette';

// Kedalaman gambar: di atas semua isi dunia (nilainya sekitar 0 sampai 2000),
// tetapi di bawah joystick (100000) dan angka melayang (1000000).
const GLOW_DEPTH = 50000;
const VIGNETTE_DEPTH = 60000;
const MOTE_DEPTH = 70000;
const MOTE_COUNT = 22;

function makeRadial(
  scene: Phaser.Scene,
  key: string,
  size: number,
  stops: ReadonlyArray<readonly [number, string]>,
  smooth: boolean,
): void {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, size, size);
  if (!texture) return;
  const ctx = texture.getContext();
  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  for (const [at, color] of stops) gradient.addColorStop(at, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  texture.refresh();
  if (smooth) texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
}

export function ensureAtmosphereTextures(scene: Phaser.Scene): void {
  makeRadial(
    scene,
    GLOW_TEXTURE,
    64,
    [
      [0, 'rgba(255,235,170,0.95)'],
      [0.35, 'rgba(255,205,120,0.4)'],
      [1, 'rgba(255,180,90,0)'],
    ],
    true,
  );
  makeRadial(
    scene,
    MOTE_TEXTURE,
    8,
    [
      [0, 'rgba(255,250,200,1)'],
      [0.5, 'rgba(255,230,150,0.5)'],
      [1, 'rgba(255,220,130,0)'],
    ],
    true,
  );
  makeRadial(
    scene,
    VIGNETTE_TEXTURE,
    128,
    [
      [0, 'rgba(4,2,16,0)'],
      [0.55, 'rgba(4,2,16,0)'],
      [1, 'rgba(4,2,16,0.75)'],
    ],
    true,
  );
}

// Cahaya hangat berdenyut di sekitar bohlam lampu jalan.
export function addLampGlow(scene: Phaser.Scene, x: number, y: number, depth: number): void {
  ensureAtmosphereTextures(scene);
  const glow = scene.add
    .image(x, y, GLOW_TEXTURE)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setScale(0.9)
    .setAlpha(0.3)
    .setDepth(depth);
  scene.tweens.add({
    targets: glow,
    alpha: 0.45,
    scale: 1.05,
    duration: 1200 + Math.random() * 1200,
    delay: Math.random() * 1500,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
}

export class Atmosphere {
  private readonly playerGlow: Phaser.GameObjects.Image;

  constructor(
    scene: Phaser.Scene,
    private readonly target: Phaser.GameObjects.Image,
  ) {
    ensureAtmosphereTextures(scene);
    const cam = scene.cameras.main;

    this.playerGlow = scene.add
      .image(0, 0, GLOW_TEXTURE)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(2.2)
      .setAlpha(0.45)
      .setDepth(GLOW_DEPTH);

    scene.add
      .image(cam.width / 2, cam.height / 2, VIGNETTE_TEXTURE)
      .setScrollFactor(0)
      .setDisplaySize(cam.width, cam.height)
      .setDepth(VIGNETTE_DEPTH);

    for (let i = 0; i < MOTE_COUNT; i++) this.addMote(scene, cam.width, cam.height);
  }

  // Dipanggil tiap frame: cahaya lentera Nara mengikuti dan berkedip halus.
  update(time: number): void {
    const flicker = 1 + Math.sin(time * 0.005) * 0.05 + Math.sin(time * 0.013) * 0.03;
    this.playerGlow
      .setPosition(this.target.x + 5, this.target.y - 10)
      .setScale(2.2 * flicker)
      .setAlpha(0.45 * flicker);
  }

  // Titik cahaya yang menempel di layar (bukan di dunia), melayang pelan.
  private addMote(scene: Phaser.Scene, width: number, height: number): void {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const mote = scene.add
      .image(x, y, MOTE_TEXTURE)
      .setScrollFactor(0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.1)
      .setDepth(MOTE_DEPTH);
    scene.tweens.add({
      targets: mote,
      x: x + (Math.random() - 0.5) * 40,
      y: y - 8 - Math.random() * 30,
      alpha: 0.7,
      duration: 2500 + Math.random() * 2500,
      delay: Math.random() * 3000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}
