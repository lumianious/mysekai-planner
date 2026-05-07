// ======== 路面瓦片解析（裁核 / 全瓦双策略） ========
// INPUT: 预铺的 ground sprite 图像 + 源 grid_w
// OUTPUT: TilePattern { canvas, mode, sourceTilePx, underlayColor }
// POS: src/utils/croppedTile.ts —— 路面 sprite 渲染策略选择
//
// 两种 source 形态：
//  A. snake-shape（不透明像素 < 70%）：T/Z 形交联，单独渲染会大量漏底。
//     → 裁出最大全不透明矩形作为均匀核心，简单铺贴，丢失连接细节但视觉干净。
//  B. running-bond（不透明像素 ≥ 70%，例如砖路）：单瓦带有 α≈220 的偏移砖排，
//     需要保留这部分以呈现错位拼接。
//     → 直接用整个源 tile，世界坐标对齐铺贴 + 采样底色作为兜底，相邻 fixture
//       的砖排连续延伸，不会重置成"行行同位"。

const cache = new WeakMap<HTMLImageElement, TilePattern>()
// 区分"路面本体"和"连接臂透明区"：路面像素 α≈224-255，连接臂 α=0。
// 阈值取 100 既兼容偏移砖排（α≈220）也排除半透明 anti-alias 边缘 + 全 0 透明区。
const ALPHA_OPAQUE = 100
// 70% 阈值：snake / running-bond 实测分界（snake ~30%, brick/stone/soil ~91%）
const FULL_TILE_OPACITY_RATIO = 0.7

export type TilePatternMode = 'core-crop' | 'full-tile'

export interface TilePattern {
  canvas: HTMLCanvasElement
  mode: TilePatternMode
  sourceTilePx: number          // 单格源 tile 的像素宽度（用于 fillPatternScale 计算）
  underlayColor: string | null  // 全瓦模式下为采样均色，裁核模式下 null
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

// ======== 二值矩阵中的最大全 1 子矩形（直方图法 O(W·H)） ========
function maxOpaqueRect(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Rect {
  const heights = new Int32Array(width)
  let best: Rect & { area: number } = { x: 0, y: 0, w: 0, h: 0, area: 0 }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * 4 + 3]
      heights[x] = a >= ALPHA_OPAQUE ? heights[x] + 1 : 0
    }
    const stack: number[] = []
    for (let x = 0; x <= width; x++) {
      const h = x === width ? 0 : heights[x]
      while (stack.length && heights[stack[stack.length - 1]] > h) {
        const top = stack.pop() as number
        const left = stack.length ? stack[stack.length - 1] : -1
        const w = x - left - 1
        const area = heights[top] * w
        if (area > best.area) {
          best = {
            x: left + 1,
            y: y - heights[top] + 1,
            w,
            h: heights[top],
            area,
          }
        }
      }
      stack.push(x)
    }
  }

  return { x: best.x, y: best.y, w: best.w, h: best.h }
}

// ======== 行同步合成：每行取最长 opaque 段水平铺满，全 α=255 ========
// 输入：source ImageData (RGBA)
// 输出：tilePx × tilePx 的离屏 canvas，全像素不透明，砖纹/纹理细节保留。
function synthesizeCleanTile(source: ImageData, tilePx: number): HTMLCanvasElement {
  const out = document.createElement('canvas')
  out.width = tilePx
  out.height = tilePx
  const ctx = out.getContext('2d')!
  const dst = ctx.createImageData(tilePx, tilePx)
  const src = source.data

  for (let y = 0; y < tilePx; y++) {
    // 扫描该行，找最长 opaque run
    let bestStart = -1
    let bestLen = 0
    let curStart = -1
    for (let x = 0; x <= tilePx; x++) {
      const a = x < tilePx ? src[(y * tilePx + x) * 4 + 3] : 0
      if (a >= ALPHA_OPAQUE) {
        if (curStart < 0) curStart = x
      } else if (curStart >= 0) {
        const len = x - curStart
        if (len > bestLen) {
          bestLen = len
          bestStart = curStart
        }
        curStart = -1
      }
    }
    if (bestLen <= 0) continue // 整行无 opaque 像素 —— 留作 0；后续 fallback 会处理

    // 把 [bestStart..bestStart+bestLen) 水平铺满整行
    for (let x = 0; x < tilePx; x++) {
      const offset = ((x - bestStart) % bestLen + bestLen) % bestLen
      const sx = bestStart + offset
      const sIdx = (y * tilePx + sx) * 4
      const dIdx = (y * tilePx + x) * 4
      dst.data[dIdx] = src[sIdx]
      dst.data[dIdx + 1] = src[sIdx + 1]
      dst.data[dIdx + 2] = src[sIdx + 2]
      dst.data[dIdx + 3] = 255
    }
  }

  // 二次填补：若某行整行透明（bestLen==0），从最近的有内容行复制
  for (let y = 0; y < tilePx; y++) {
    if (dst.data[(y * tilePx) * 4 + 3] !== 0) continue
    let donorY = -1
    for (let dy = 1; dy < tilePx; dy++) {
      const up = y - dy
      const dn = y + dy
      if (up >= 0 && dst.data[(up * tilePx) * 4 + 3] !== 0) {
        donorY = up
        break
      }
      if (dn < tilePx && dst.data[(dn * tilePx) * 4 + 3] !== 0) {
        donorY = dn
        break
      }
    }
    if (donorY < 0) continue
    for (let x = 0; x < tilePx; x++) {
      const sIdx = (donorY * tilePx + x) * 4
      const dIdx = (y * tilePx + x) * 4
      dst.data[dIdx] = dst.data[sIdx]
      dst.data[dIdx + 1] = dst.data[sIdx + 1]
      dst.data[dIdx + 2] = dst.data[sIdx + 2]
      dst.data[dIdx + 3] = 255
    }
  }

  ctx.putImageData(dst, 0, 0)
  return out
}

// ======== 采样所有 α≥阈值像素的均色，作为透明区域兜底 ========
function sampleDominantColor(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): string | null {
  let r = 0
  let g = 0
  let b = 0
  let count = 0
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4
    const a = data[idx + 3]
    if (a < ALPHA_OPAQUE) continue
    r += data[idx]
    g += data[idx + 1]
    b += data[idx + 2]
    count++
  }
  if (count === 0) return null
  return `rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`
}

export function getTilePattern(
  img: HTMLImageElement,
  gridW: number,
): TilePattern | null {
  if (!img.naturalWidth || !img.naturalHeight || gridW <= 0) return null

  const cached = cache.get(img)
  if (cached) return cached

  const tilePx = Math.floor(img.naturalWidth / gridW)
  if (tilePx <= 0) return null

  // 提取单格源 tile（左上）
  const tileCanvas = document.createElement('canvas')
  tileCanvas.width = tilePx
  tileCanvas.height = tilePx
  const tileCtx = tileCanvas.getContext('2d')
  if (!tileCtx) return null
  tileCtx.drawImage(img, 0, 0, tilePx, tilePx, 0, 0, tilePx, tilePx)

  const imageData = tileCtx.getImageData(0, 0, tilePx, tilePx)
  const total = tilePx * tilePx

  // 计算不透明像素占比
  let opaqueCount = 0
  for (let i = 0; i < total; i++) {
    if (imageData.data[i * 4 + 3] >= ALPHA_OPAQUE) opaqueCount++
  }
  const opaqueRatio = opaqueCount / total

  // 用户选择：所有 tile 统一裁核，宁可丢失 running-bond 细节，也不要 snake 外形。
  void opaqueRatio
  void FULL_TILE_OPACITY_RATIO
  const rect = maxOpaqueRect(imageData.data, tilePx, tilePx)
  if (rect.w < 4 || rect.h < 4) {
    const result: TilePattern = {
      canvas: tileCanvas,
      mode: 'full-tile',
      sourceTilePx: tilePx,
      underlayColor: sampleDominantColor(imageData.data, tilePx, tilePx),
    }
    cache.set(img, result)
    return result
  }
  const coreCanvas = document.createElement('canvas')
  coreCanvas.width = rect.w
  coreCanvas.height = rect.h
  const coreCtx = coreCanvas.getContext('2d')
  if (!coreCtx) return null
  coreCtx.drawImage(
    tileCanvas,
    rect.x,
    rect.y,
    rect.w,
    rect.h,
    0,
    0,
    rect.w,
    rect.h,
  )

  const result: TilePattern = {
    canvas: coreCanvas,
    mode: 'core-crop',
    sourceTilePx: tilePx,
    underlayColor: null,
  }
  cache.set(img, result)
  return result
}
