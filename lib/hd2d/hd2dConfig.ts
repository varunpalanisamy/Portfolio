export const HD2D = {
  tileSize: 1,
  mapTiles: 32,
  camera: {
    // Orthographic, slightly flattened like Gamma Emerald / Octopath travel maps.
    position: [0, 18, 20] as const,
    target: [0, 0, 0] as const,
    zoom: 42,
    near: 0.1,
    far: 120,
  },
  light: {
    // Behind-camera golden-hour key light. Shadows project toward the player.
    sunPosition: [-8, 14, 12] as const,
    sunColor: '#ffbf72',
    sunIntensity: 3.2,
    ambientColor: '#5f6d90',
    ambientIntensity: 0.55,
    fogColor: '#f59b66',
  },
  post: {
    bloomIntensity: 0.45,
    bloomLuminanceThreshold: 0.72,
    vignetteDarkness: 0.72,
    tiltShiftFocusY: 0.52,
    tiltShiftFalloff: 0.24,
  },
} as const

export type HD2DObjectKind = 'player' | 'building' | 'tree' | 'bush' | 'cliff' | 'clutter'

export type HD2DPlacedSprite = {
  kind: HD2DObjectKind
  texture: string
  x: number
  z: number
  y?: number
  width: number
  height: number
  shadowRadius?: number
  castsShadow?: boolean
}

export const tileToWorld = (tileX: number, tileY: number, height = 0) => ({
  x: (tileX - HD2D.mapTiles / 2 + 0.5) * HD2D.tileSize,
  y: height,
  z: (tileY - HD2D.mapTiles / 2 + 0.5) * HD2D.tileSize,
})

