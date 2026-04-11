// ======== 编辑器核心类型 ========

export type ToolMode = 'select' | 'stamp' | 'remove' | 'brush'
export type Rotation = 0 | 90 | 180 | 270
export type ItemLayer = 'ground' | 'furniture'
export type AreaLevel = 1 | 2 | 3 | 4 | 5

export interface GridSize {
  width: number
  depth: number
}

// ======== 家具数据类型（来自 sekai-master-db-diff）========

export interface Fixture {
  id: number
  name: string                          // 日文名称
  pronunciation: string                 // 平假名读音（搜索用）
  assetbundleName: string               // CDN 缩略图路径段
  gridSize: GridSize                    // 占地尺寸（格子数）
  colorCode: string                     // 颜色代码（可能为空）
  mysekaiFixtureType: 'normal' | 'system' | 'surface_appearance'
  mysekaiFixtureMainGenreId: number     // 主分类 FK（12=道 13=柵 31=カラータイル）
  mysekaiFixtureSubGenreId: number      // 子分类 FK
  // 交互句柄类型 — 用于 Brush 工具决定拖拽画刷 vs 线工具
  // 'road'  → 道/カラータイル（拖拽画刷）
  // 'fence' → 柵（线工具）
  // 其余值保留以支持现有家具
  mysekaiFixtureHandleType:
    | 'none'
    | 'block'
    | 'light'
    | 'road'
    | 'windowpane'
    | 'clock'
    | 'fence'
    | 'idle_timeline'
    | 'block_transparent'
  mysekaiSettableSiteType: 'home' | 'room' | 'any'
  // 放置布局类型 — Phase 1 缺失 'road' 和 'floor_appearance'，导致道路/地面外观
  // 被错误路由到家具层（违反 ROAD-04 / D-41）
  mysekaiSettableLayoutType:
    | 'floor'
    | 'wall'
    | 'rug'
    | 'wall_appearance'
    | 'road'
    | 'floor_appearance'
  mysekaiFixturePutType: 'none' | 'put_base' | 'put_target'
}

export interface FixtureMainGenre {
  id: number
  name: string
  mysekaiFixtureMainGenreType: string
  seq: number
}

export interface FixtureSubGenre {
  id: number
  name: string
  mysekaiFixtureSubGenreType: string
  mysekaiFixtureMainGenreId: number
  seq: number
}

// ======== 放置物品 ========

export interface PlacedItem {
  id: string
  fixtureId: number
  x: number          // 网格列（左上角）
  y: number          // 网格行（左上角）
  rotation: Rotation
  layer: ItemLayer
  isSystem: boolean   // gate/house = true，不可删除
}

// ========================================
// 边数据模型（Phase 02.1）
// 围栏等实体存在于网格格点的边上，而非格子内
// ========================================

export type EdgeOrientation = 'h' | 'v'

/**
 * 放置在网格边上的实体（目前仅围栏使用）
 *
 * 坐标语义：
 *   orientation='h'：位于格子(x,y)的上边（y-1 与 y 的分界）
 *     有效范围：0 ≤ x < W, 0 ≤ y ≤ D
 *   orientation='v'：位于格子(x,y)的左边（x-1 与 x 的分界）
 *     有效范围：0 ≤ x ≤ W, 0 ≤ y < D
 *
 * Phase 3 URL 编码备注：
 *   序列化建议 orientation 使用 0='h' / 1='v' 以减少 URL 长度
 */
export interface PlacedEdge {
  id: string
  fixtureId: number
  x: number
  y: number
  orientation: EdgeOrientation
}

// ======== 热栏 ========

export interface HotbarSlot {
  fixtureId: number | null
}

// ======== 编辑器状态 ========

export interface EditorState {
  // -- 核心状态 --
  areaLevel: AreaLevel
  gridSize: GridSize
  placedItems: Record<string, PlacedItem>
  placedEdges: Record<string, PlacedEdge>  // Phase 02.1 边数据（围栏等）
  selectedItemId: string | null
  toolMode: ToolMode
  activeFixtureId: number | null
  overwriteEnabled: boolean
  previewRotation: Rotation  // 预览旋转（stamp 模式下鬼影的旋转角度）
  hotbar: HotbarSlot[]
  isEditorReady: boolean     // false = 显示欢迎界面
  flashItemIds: string[]     // undo/redo 闪烁动画目标项
  stageScale: number         // 画布缩放比例（供 StatusBar 读取）

  // -- 动作 --
  placeItem: (item: Omit<PlacedItem, 'id'>) => void
  moveItem: (id: string, x: number, y: number) => void
  rotateItem: (id: string, direction: 'cw' | 'ccw') => void
  removeItem: (id: string) => void
  // Phase 02.1 边操作
  placeEdge: (edge: Omit<PlacedEdge, 'id'>) => void
  removeEdge: (id: string) => void
  clearEdges: () => void
  setToolMode: (mode: ToolMode) => void
  setAreaLevel: (level: AreaLevel) => void
  // D-30 / D-39: 可选 fixture 参数让 store 根据 handleType 自动路由 brush vs stamp 模式
  // 省略 fixture 时回退到旧行为（stamp），保持 Phase 1 兼容
  setActiveFixture: (fixtureId: number | null, fixture?: Fixture | null) => void
  setSelectedItem: (id: string | null) => void
  toggleOverwrite: () => void
  rotatePreview: (direction: 'cw' | 'ccw') => void
  assignHotbar: (slot: number, fixtureId: number) => void
  activateHotbar: (slot: number, fixture?: Fixture | null) => void
  startEditor: (level: AreaLevel) => void
  triggerFlash: (ids: string[]) => void
  setStageScale: (scale: number) => void
}
