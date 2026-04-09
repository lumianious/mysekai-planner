// ======== 编辑器核心类型 ========

export type ToolMode = 'select' | 'stamp' | 'remove'
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
  mysekaiFixtureMainGenreId: number     // 主分类 FK
  mysekaiFixtureSubGenreId: number      // 子分类 FK
  mysekaiSettableSiteType: 'home' | 'room' | 'any'
  mysekaiSettableLayoutType: 'floor' | 'wall' | 'rug' | 'wall_appearance'
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
  selectedItemId: string | null
  toolMode: ToolMode
  activeFixtureId: number | null
  overwriteEnabled: boolean
  previewRotation: Rotation  // 预览旋转（stamp 模式下鬼影的旋转角度）
  hotbar: HotbarSlot[]
  isEditorReady: boolean     // false = 显示欢迎界面

  // -- 动作 --
  placeItem: (item: Omit<PlacedItem, 'id'>) => void
  moveItem: (id: string, x: number, y: number) => void
  rotateItem: (id: string, direction: 'cw' | 'ccw') => void
  removeItem: (id: string) => void
  setToolMode: (mode: ToolMode) => void
  setAreaLevel: (level: AreaLevel) => void
  setActiveFixture: (fixtureId: number | null) => void
  setSelectedItem: (id: string | null) => void
  toggleOverwrite: () => void
  rotatePreview: (direction: 'cw' | 'ccw') => void
  assignHotbar: (slot: number, fixtureId: number) => void
  activateHotbar: (slot: number) => void
  startEditor: (level: AreaLevel) => void
}
