// ======== 网格线栅格化 ========
// INPUT: 起止格子坐标 + 可选步长（默认 1，画刷传 fixtureWidth）
// OUTPUT: 从 start 到 end 顺序排列的所有中间格子坐标数组
// POS: src/utils/rasterize.ts — 纯函数，供 EditorCanvas 拖拽画刷与围栏线工具使用
//
// 使用 4 连通 Bresenham（相邻样本共享一条边，无对角跳跃），这是 D-33
// "高速拖拽不产生间隙" 的基本要求。
//
// 对画刷：step 取 fixture.gridSize.width（v1 全部为 2），保证相邻样本不重叠。
// 对围栏线：调用方先用 snapToAxis 对齐端点，rasterizer 退化为直线迭代。
//
// 算法细节：先将输入映射到 step-space (除以 step 再 round)，在 step-space
// 内做 4 连通 Bresenham，再乘回 step 输出 —— 每个输出坐标都是 step 的整数倍。
//
// 调用方契约：传入的 x0/y0/x1/y1 应该已经按 step 预先对齐（EditorCanvas
// 通过 `Math.floor(rawX / step) * step` 做预处理）。未对齐时本函数通过
// Math.round 进行容错。退化情形（start == end）直接返回原始坐标。

export interface Tile {
  x: number
  y: number
}

// ======== 4 连通 Bresenham 栅格化 ========

export function rasterizeLine(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  step = 1,
): Tile[] {
  if (step <= 0) throw new Error('rasterizeLine: step must be > 0')

  // 退化情形：起止相同 —— 直接返回原始坐标（保留调用方传入值）
  if (x0 === x1 && y0 === y1) {
    return [{ x: x0, y: y0 }]
  }

  // 映射到 step-space（每一次迭代代表一个 step 距离）
  let sx = Math.round(x0 / step)
  let sy = Math.round(y0 / step)
  const ex = Math.round(x1 / step)
  const ey = Math.round(y1 / step)

  const dx = Math.abs(ex - sx)
  const dy = Math.abs(ey - sy)
  const signX = sx < ex ? 1 : -1
  const signY = sy < ey ? 1 : -1

  // 4 连通 Bresenham：标准 err = dx - dy 累积误差，但当同一次迭代里
  // 同时要求走 X 和 Y 时，拆成两步（先 X 后 Y），保证相邻 tile 仅差一个轴。
  const tiles: Tile[] = [{ x: sx * step, y: sy * step }]
  let err = dx - dy
  // 安全上限防止异常输入导致死循环
  const maxIter = (dx + dy) * 2 + 2
  let iter = 0

  while (iter++ < maxIter) {
    if (sx === ex && sy === ey) break
    const e2 = 2 * err
    if (e2 > -dy) {
      err -= dy
      sx += signX
      tiles.push({ x: sx * step, y: sy * step })
      if (sx === ex && sy === ey) break
    }
    if (e2 < dx) {
      err += dx
      sy += signY
      tiles.push({ x: sx * step, y: sy * step })
    }
  }

  return tiles
}

// ======== 轴对齐吸附（围栏线工具 D-35） ========
// 将自由端点强制为同一行或同一列；dx==dy 平局默认水平

export function snapToAxis(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): Tile {
  const dx = Math.abs(endX - startX)
  const dy = Math.abs(endY - startY)
  return dx >= dy
    ? { x: endX, y: startY } // 水平线（包括 dx==dy 的平局）
    : { x: startX, y: endY } // 垂直线
}
