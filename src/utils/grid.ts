import type { GridSize, Rotation } from '../types/editor'

// ======== 网格数学工具 ========

export const TILE_SIZE = 32 // 像素/格

export function snapToGrid(
  pos: { x: number; y: number },
  tileSize: number = TILE_SIZE,
) {
  return {
    x: Math.round(pos.x / tileSize) * tileSize,
    y: Math.round(pos.y / tileSize) * tileSize,
  }
}

export function getEffectiveSize(
  gridSize: GridSize,
  rotation: Rotation,
): [number, number] {
  if (rotation === 90 || rotation === 270) {
    return [gridSize.depth, gridSize.width]
  }
  return [gridSize.width, gridSize.depth]
}

export function tileKey(x: number, y: number): string {
  return `${x},${y}`
}

export function isInBounds(
  x: number,
  y: number,
  width: number,
  depth: number,
  gridWidth: number,
  gridDepth: number,
): boolean {
  return x >= 0 && y >= 0 && x + width <= gridWidth && y + depth <= gridDepth
}
