import Phaser from 'phaser'

export type VolumeUpdate  = (bass: number, drums: number, music: number, vocals: number) => void
export type ZoneCallback  = (zone: 'hub'|'projects'|'experience'|'about'|'contact') => void
export type ItemCallback  = (type: 'project'|'job'|null, index: number) => void
export type BattleCallback = () => void

let battlePaused = false
export const setBattlePaused = (v: boolean) => { battlePaused = v }

const MAP_TILES = 32
const TILE      = 32
const MAP_W     = MAP_TILES * TILE
const MAP_H     = MAP_TILES * TILE
const SPEED     = 3
const FRAME_W   = 48, FRAME_H = 48, PLAYER_SCALE = 0.72

const RD0 = 14, RD1 = 18
const AUDIO_FADE = 400

const BLDG = {
  museum: { x: 8  * TILE + TILE/2, y: 294 },
  gym:    { x: 23 * TILE + TILE/2, y: 288 },
  center: { x: 8  * TILE + TILE/2, y: 813 },
  mart:   { x: 23 * TILE + TILE/2, y: 769 },
}
const BLDG_BASE_N = 13 * TILE
const BLDG_BASE_S = (MAP_TILES - 4) * TILE

const f = (r: number, c: number) => r * 4 + c
type Dir8 = 'down'|'down-right'|'right'|'up-right'|'up'|'up-left'|'left'|'down-left'
const ROW: Record<Dir8, number> = {
  down:0,'down-right':1,right:2,'up-right':3,up:4,'up-left':5,left:6,'down-left':7,
}

const CMAP: boolean[][] = Array.from({ length: MAP_TILES }, () => Array(MAP_TILES).fill(false))

function buildCollisionMap() {
  for (let r = 0; r < MAP_TILES; r++) {
    for (let c = 0; c < MAP_TILES; c++) {
      const onRoad = (c >= RD0 && c < RD1) || (r >= RD0 && r < RD1)
      if ((r < 3 || r >= MAP_TILES - 3 || c < 3 || c >= MAP_TILES - 3) && !onRoad) {
        CMAP[r][c] = true
      }
    }
  }
  const footprints: [number,number,number,number][] = [
    [5,  5,  11, 13],
    [20, 5,  26, 13],
    [5,  23, 11, 28],
    [21, 20, 25, 28],
  ]
  for (const [c0, r0, c1, r1] of footprints) {
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (r >= 0 && r < MAP_TILES && c >= 0 && c < MAP_TILES) CMAP[r][c] = true
      }
    }
  }
}

const TALL_GRASS = new Set<string>()
;(() => {
  for (let i = RD0; i < RD1; i++) {
    for (let r = 0; r < 3; r++) {
      TALL_GRASS.add(`${i},${r}`)
      TALL_GRASS.add(`${i},${MAP_TILES - 1 - r}`)
    }
    for (let c = 0; c < 3; c++) {
      TALL_GRASS.add(`${c},${i}`)
      TALL_GRASS.add(`${MAP_TILES - 1 - c},${i}`)
    }
  }
})()

export class GameScene extends Phaser.Scene {
  private player!:  Phaser.GameObjects.Sprite
  private shadow!:  Phaser.GameObjects.Image
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!:    { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key }
  private onVolume: VolumeUpdate
  private onZone:   ZoneCallback
  private onItem:   ItemCallback
  private onBattle: BattleCallback
  private lastDir:  Dir8 = 'down'
  private curZone:  'hub'|'projects'|'experience'|'about'|'contact' = 'hub'
  private lastTileKey = ''
  private grassSteps  = 0

  constructor(onVolume: VolumeUpdate, onZone: ZoneCallback, onItem: ItemCallback, onBattle: BattleCallback) {
    super({ key: 'GameScene' })
    this.onVolume = onVolume; this.onZone = onZone; this.onItem = onItem; this.onBattle = onBattle
  }

  preload() {
    this.load.image('bldg_museum',  '/bldg_museum.png')
    this.load.image('bldg_gym',     '/bldg_gym.png')
    this.load.image('bldg_mart',    '/bldg_mart.png')
    this.load.image('bldg_center',  '/bldg_center.png')
    this.load.image('road_tile',    '/road_tile.png')
    this.load.image('grass_tile',   '/grass_tile.png')
    this.load.spritesheet('snivy', '/snivy_sheet.png', { frameWidth: FRAME_W, frameHeight: FRAME_H })
    this.load.image('shadow', '/defaultShadow.png')
    this.load.image('tree_pine_a', '/deco_tree_pine.png')
    this.load.image('tree_pine_b', '/deco_tree_pine2.png')
    this.load.image('bush_sm',    '/deco_bush_sm_green.png')
    this.load.image('bush_sm_lt', '/deco_bush_sm_light.png')
    this.load.image('bush_md',    '/deco_bush_md_green.png')
    this.load.image('bush_cone',  '/deco_bush_md_cone.png')
  }

  create() {
    buildCollisionMap()
    this.drawTerrain()
    this.drawAtmosphere()
    this.placePerimeterTrees()
    this.placeDecorations()
    this.placeBuildings()
    this.createAnimations()

    const startX = MAP_W / 2, startY = MAP_H / 2

    // Low sunset light behind the camera: shadows fall forward on the ground plane.
    this.shadow = this.add.image(startX + 2, startY + 24, 'shadow')
      .setScale(1.05, 0.22).setAlpha(0.54).setDepth(9)

    this.player = this.add.sprite(startX, startY, 'snivy', f(0, 0))
      .setScale(PLAYER_SCALE).setDepth(10).setTint(0xFFCC88)
    this.player.play('idle-down')

    this.cameras.main.setZoom(1.72)
    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H)
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd = {
      up:    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down:  this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left:  this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    }
  }

  // ── World-space warm sunset wash — scrolls with camera ──────────────────────
  private drawAtmosphere() {
    const sun = this.add.graphics().setDepth(-1.5).setAlpha(0.30)
    sun.fillGradientStyle(0xFFB05A, 0xFF8A64, 0x243B12, 0x122311, 1)
    sun.fillRect(0, 0, MAP_W, MAP_H)
  }

  // ── Terrain ────────────────────────────────────────────────────────────────
  private drawTerrain() {
    this.add.tileSprite(MAP_W / 2, MAP_H / 2, MAP_W, MAP_H, 'grass_tile').setDepth(-3)

    // Aerial depth: warm-hazy at top (far north), rich at bottom (near south)
    const dg = this.add.graphics().setDepth(-2).setAlpha(0.22)
    dg.fillGradientStyle(0xFFC56C, 0xFF8E78, 0x2F511A, 0x183018, 1)
    dg.fillRect(0, 0, MAP_W, MAP_H)

    const roadW = (RD1 - RD0) * TILE
    const midX  = (RD0 + RD1) * TILE / 2
    const midY  = (RD0 + RD1) * TILE / 2

    const rg = this.add.graphics().setDepth(-1)
    rg.fillStyle(0x5A4E3C)
    rg.fillRect(RD0 * TILE - 3, 0,              roadW + 6, MAP_H)
    rg.fillRect(0,              RD0 * TILE - 3, MAP_W,     roadW + 6)

    this.add.tileSprite(midX, MAP_H / 2, roadW, MAP_H, 'road_tile').setDepth(-1)
    this.add.tileSprite(MAP_W / 2, midY, MAP_W, roadW, 'road_tile').setDepth(-1)

    const tg = this.add.graphics().setDepth(0)
    tg.fillStyle(0x5A9C30, 0.8)
    for (const key of TALL_GRASS) {
      const [tc, tr] = key.split(',').map(Number)
      tg.fillRect(tc * TILE + 2, tr * TILE + 2, TILE - 4, TILE - 4)
    }

    rg.fillStyle(0x5A9430, 0.55)
    rg.fillRect(RD0 * TILE - 4, 3 * TILE,            4, (RD0 - 3) * TILE)
    rg.fillRect(RD1 * TILE,     3 * TILE,            4, (RD0 - 3) * TILE)
    rg.fillRect(RD0 * TILE - 4, RD1 * TILE,          4, (MAP_TILES - 3 - RD1) * TILE)
    rg.fillRect(RD1 * TILE,     RD1 * TILE,          4, (MAP_TILES - 3 - RD1) * TILE)
    rg.fillRect(3 * TILE,            RD0 * TILE - 4, (RD0 - 3) * TILE, 4)
    rg.fillRect(3 * TILE,            RD1 * TILE,     (RD0 - 3) * TILE, 4)
    rg.fillRect(RD1 * TILE,          RD0 * TILE - 4, (MAP_TILES - 3 - RD1) * TILE, 4)
    rg.fillRect(RD1 * TILE,          RD1 * TILE,     (MAP_TILES - 3 - RD1) * TILE, 4)
  }

  // ── Perimeter tree ring with directional shadows ───────────────────────────
  private placePerimeterTrees() {
    const SPACING = 2
    const sg = this.add.graphics().setDepth(2.0)
    sg.fillStyle(0x071000, 0.46)

    const placeTree = (tc: number, tr: number, i: number) => {
      const wx   = (tc + 0.5) * TILE
      const base = (tr + 0.5) * TILE + 16   // sprite bottom-anchor Y

      // Long forward shadow: sun is behind the camera, so objects project toward the viewer.
      sg.fillPoints([
        new Phaser.Math.Vector2(wx - 8,  base),
        new Phaser.Math.Vector2(wx + 8,  base),
        new Phaser.Math.Vector2(wx + 20, base + 82),
        new Phaser.Math.Vector2(wx - 4,  base + 82),
      ], true)

      const key = i % 2 === 0 ? 'tree_pine_a' : 'tree_pine_b'
      this.add.image(wx, base, key)
        .setScale(1.05).setOrigin(0.5, 1.0).setDepth(2.5)
        .setTint(0xFFC37A)
    }

    let idx = 0
    for (let c = 1; c < MAP_TILES - 1; c += SPACING) {
      if (!(c >= RD0 - 1 && c <= RD1)) placeTree(c, 1, idx++)
    }
    for (let c = 1; c < MAP_TILES - 1; c += SPACING) {
      if (!(c >= RD0 - 1 && c <= RD1)) placeTree(c, MAP_TILES - 2, idx++)
    }
    for (let r = 3; r < MAP_TILES - 3; r += SPACING) {
      if (!(r >= RD0 - 1 && r <= RD1)) placeTree(1, r, idx++)
    }
    for (let r = 3; r < MAP_TILES - 3; r += SPACING) {
      if (!(r >= RD0 - 1 && r <= RD1)) placeTree(MAP_TILES - 2, r, idx++)
    }
  }

  // ── Quadrant decorations with directional shadows ──────────────────────────
  private placeDecorations() {
    const sg = this.add.graphics().setDepth(3.0)
    sg.fillStyle(0x071000, 0.38)

    const place = (tc: number, tr: number, key: string, sc = 0.85) => {
      const wx   = (tc + 0.5) * TILE
      const base = (tr + 1.0) * TILE

      sg.fillPoints([
        new Phaser.Math.Vector2(wx - 5,  base),
        new Phaser.Math.Vector2(wx + 5,  base),
        new Phaser.Math.Vector2(wx + 11, base + 36),
        new Phaser.Math.Vector2(wx - 5,  base + 36),
      ], true)

      this.add.image(wx, base, key)
        .setScale(sc).setOrigin(0.5, 1.0).setDepth(3.5)
        .setTint(0xFFC37A)
    }

    // NW quadrant
    for (let c = 3; c <= 12; c += 2) place(c, 3, c % 4 === 1 ? 'bush_md' : 'bush_sm')
    for (let r = 4; r <= 6;  r += 2) place(3, r, 'bush_cone')
    place(12, 4, 'bush_md'); place(12, 6, 'bush_sm')

    // NE quadrant
    for (let c = 18; c <= 27; c += 2) place(c, 3, c % 4 === 0 ? 'bush_md' : 'bush_sm')
    for (let r = 4;  r <= 6;  r += 2) place(27, r, 'bush_cone')
    place(19, 4, 'bush_md'); place(19, 6, 'bush_sm')

    // SW quadrant
    for (let c = 3; c <= 12; c += 2) place(c, 27, c % 4 === 1 ? 'bush_md' : 'bush_sm')
    for (let r = 22; r <= 26; r += 2) place(3, r, 'bush_cone')
    place(12, 22, 'bush_md'); place(12, 24, 'bush_sm')

    // SE quadrant
    for (let c = 18; c <= 27; c += 2) place(c, 27, c % 4 === 0 ? 'bush_md' : 'bush_sm')
    for (let r = 22; r <= 26; r += 2) place(27, r, 'bush_cone')
    place(19, 22, 'bush_md'); place(19, 24, 'bush_sm')

    // Road-entry accent bushes
    place(13, 3,  'bush_sm_lt'); place(18, 3,  'bush_sm_lt')
    place(13, 27, 'bush_sm_lt'); place(18, 27, 'bush_sm_lt')
    place(3,  13, 'bush_sm_lt'); place(3,  18, 'bush_sm_lt')
    place(27, 13, 'bush_sm_lt'); place(27, 18, 'bush_sm_lt')
  }

  // ── Buildings with long directional shadow parallelograms ──────────────────
  private placeBuildings() {
    const sg = this.add.graphics().setDepth(4.0)
    sg.fillStyle(0x071000, 0.52)

    // hw = half-width of building base; bldgH = scaled pixel height
    const bShadow = (cx: number, baseY: number, hw: number, bldgH: number) => {
      const sl = bldgH * 0.92   // long, low-sun shadow length along ground
      const sx = bldgH * 0.06   // mostly forward, like sun is behind the viewer
      sg.fillPoints([
        new Phaser.Math.Vector2(cx - hw,      baseY),
        new Phaser.Math.Vector2(cx + hw,      baseY),
        new Phaser.Math.Vector2(cx + hw + sx, baseY + sl),
        new Phaser.Math.Vector2(cx - hw + sx, baseY + sl),
      ], true)
    }

    // Museum (NW) — Blue Pagoda 91×243, scale 1.25
    bShadow(BLDG.museum.x, BLDG_BASE_N, Math.round(91 * 1.25 / 2), Math.round(243 * 1.25))
    this.add.image(BLDG.museum.x, BLDG_BASE_N, 'bldg_museum')
      .setScale(1.25).setOrigin(0.5, 1.0).setDepth(5).setTint(0xFFD0A0)

    // Gym (NE) — Golden Temple 149×236, scale 1.1
    bShadow(BLDG.gym.x, BLDG_BASE_N, Math.round(149 * 1.1 / 2), Math.round(236 * 1.1))
    this.add.image(BLDG.gym.x, BLDG_BASE_N, 'bldg_gym')
      .setScale(1.1).setOrigin(0.5, 1.0).setDepth(5).setTint(0xFFD0A0)

    // Pokémon Center (SW) — Red-roof brick 101×283, scale 1.1
    bShadow(BLDG.center.x, BLDG_BASE_S, Math.round(101 * 1.1 / 2), Math.round(283 * 1.1))
    this.add.image(BLDG.center.x, BLDG_BASE_S, 'bldg_center')
      .setScale(1.1).setOrigin(0.5, 1.0).setDepth(5).setTint(0xFFD0A0)

    // Mart (SE) — Modern MART tower 115×273, scale 1.1
    bShadow(BLDG.mart.x, BLDG_BASE_S, Math.round(115 * 1.1 / 2), Math.round(273 * 1.1))
    this.add.image(BLDG.mart.x, BLDG_BASE_S, 'bldg_mart')
      .setScale(1.1).setOrigin(0.5, 1.0).setDepth(5).setTint(0xFFD0A0)
  }

  // ── Collision ──────────────────────────────────────────────────────────────
  private isBlocked(px: number, py: number): boolean {
    const R = 10
    const check = (x: number, y: number) => {
      const tc = Math.floor(x / TILE)
      const tr = Math.floor(y / TILE)
      if (tc < 0 || tc >= MAP_TILES || tr < 0 || tr >= MAP_TILES) return true
      return !!CMAP[tr][tc]
    }
    return check(px - R, py - R) || check(px + R, py - R) ||
           check(px - R, py + R) || check(px + R, py + R)
  }

  // ── Animations ─────────────────────────────────────────────────────────────
  private createAnimations() {
    const dirs: Dir8[] = ['down','down-right','right','up-right','up','up-left','left','down-left']
    dirs.forEach(dir => {
      const row = ROW[dir]
      this.anims.create({ key: `idle-${dir}`, frames: [{ key: 'snivy', frame: f(row, 0) }], frameRate: 1 })
      this.anims.create({
        key: `walk-${dir}`,
        frames: [
          { key: 'snivy', frame: f(row, 1) }, { key: 'snivy', frame: f(row, 0) },
          { key: 'snivy', frame: f(row, 2) }, { key: 'snivy', frame: f(row, 0) },
        ],
        frameRate: 8, repeat: -1,
      })
    })
  }

  // ── Update ─────────────────────────────────────────────────────────────────
  update() {
    if (battlePaused) return

    const up    = this.cursors.up.isDown    || this.wasd.up.isDown
    const down  = this.cursors.down.isDown  || this.wasd.down.isDown
    const left  = this.cursors.left.isDown  || this.wasd.left.isDown
    const right = this.cursors.right.isDown || this.wasd.right.isDown

    let vx = 0, vy = 0
    if (left)  vx = -SPEED
    if (right) vx =  SPEED
    if (up)    vy = -SPEED
    if (down)  vy =  SPEED
    if (vx && vy) { vx *= 0.707; vy *= 0.707 }

    const tryMove = (dx: number, dy: number) => {
      const nx = Phaser.Math.Clamp(this.player.x + dx, 0, MAP_W)
      const ny = Phaser.Math.Clamp(this.player.y + dy, 0, MAP_H)
      if (!this.isBlocked(nx, ny)) { this.player.x = nx; this.player.y = ny; return true }
      return false
    }
    if (!tryMove(vx, vy)) {
      if (!tryMove(vx, 0)) tryMove(0, vy)
    }

    // Shadow offset SE — matches sun direction
    this.shadow.x = this.player.x + 2
    this.shadow.y = this.player.y + 24

    const moving = vx !== 0 || vy !== 0
    let dir: Dir8 = this.lastDir
    if (moving) {
      if      (vx < 0 && vy < 0) dir = 'up-left'
      else if (vx > 0 && vy < 0) dir = 'up-right'
      else if (vx < 0 && vy > 0) dir = 'down-left'
      else if (vx > 0 && vy > 0) dir = 'down-right'
      else if (vx < 0)           dir = 'left'
      else if (vx > 0)           dir = 'right'
      else if (vy < 0)           dir = 'up'
      else                       dir = 'down'
      if (dir !== this.lastDir || !this.player.anims.currentAnim?.key.startsWith('walk')) {
        this.player.play(`walk-${dir}`, true); this.lastDir = dir
      }
    } else {
      if (this.player.anims.currentAnim?.key !== `idle-${this.lastDir}`)
        this.player.play(`idle-${this.lastDir}`, true)
    }

    const px = this.player.x, py = this.player.y

    if (moving) {
      const d = (b: { x: number; y: number }) => Math.hypot(px - b.x, py - b.y)
      this.onVolume(
        Math.max(0, 1 - d(BLDG.museum) / AUDIO_FADE),
        Math.max(0, 1 - d(BLDG.gym)    / AUDIO_FADE),
        Math.max(0, 1 - d(BLDG.mart)   / AUDIO_FADE),
        Math.max(0, 1 - d(BLDG.center) / AUDIO_FADE),
      )
    }

    const dMuseum = Math.hypot(px - BLDG.museum.x, py - BLDG.museum.y)
    const dGym    = Math.hypot(px - BLDG.gym.x,    py - BLDG.gym.y)
    const dMart   = Math.hypot(px - BLDG.mart.x,   py - BLDG.mart.y)
    const dCenter = Math.hypot(px - BLDG.center.x,  py - BLDG.center.y)
    const minD    = Math.min(dMuseum, dGym, dMart, dCenter)
    let zone: 'hub'|'projects'|'experience'|'about'|'contact' = 'hub'
    if (minD < 300) {
      if      (dMuseum === minD) zone = 'about'
      else if (dGym    === minD) zone = 'projects'
      else if (dMart   === minD) zone = 'experience'
      else                       zone = 'contact'
    }
    if (zone !== this.curZone) { this.curZone = zone; this.onZone(zone) }

    this.onItem(null, -1)

    const tc = Math.floor(px / TILE), tr = Math.floor(py / TILE)
    const tileKey = `${tc},${tr}`
    if (moving && tileKey !== this.lastTileKey) {
      this.lastTileKey = tileKey
      if (TALL_GRASS.has(tileKey)) {
        this.grassSteps++
        if (this.grassSteps % 4 === 0 && Math.random() < 0.35) {
          this.onBattle(); return
        }
      } else {
        this.grassSteps = 0
      }
    }
  }
}

export const PROJECT_SPOTS: never[] = []
export const JOB_SPOTS: never[]     = []
