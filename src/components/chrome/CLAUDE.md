# chrome — 编辑器外围 UI 槽位组件

Phase 7 chrome shell components. Each file declares INPUT/OUTPUT/POS in its L3 header.

| File | Role |
|------|------|
| TopRail.tsx | Slot A 容器（顶栏） |
| CostPill.tsx | 顶栏成本药丸（点击切换 cost popover） |
| AutosavePill.tsx | 自动保存指示器 |
| AreaLevelDropdown.tsx | 区域等级下拉 |
| TopRailKebab.tsx | Import/Export 溢出菜单 |
| CatalogRail.tsx | Slot B（plan 03） |
| CostPanelPopover.tsx | Slot C（plan 06） |
| FloatbarToolPill.tsx | Slot D（plan 04） |
| FloatbarDragHandle.tsx | Slot D（plan 04） |
| ZoomDock.tsx | Slot F（plan 05） |

## 约定

- 每个文件首行包含 `// ======== 名称 ========` 风格的 L3 头部，按 DocOps 协议声明 INPUT/OUTPUT/POS
- 设计令牌一律走 `src/index.css` `@theme` —— 不在组件内 hardcode 颜色/半径/阴影
- aria-label 见 `.planning/phases/07-editor-chrome-redesign/07-UI-SPEC.md` §Icon-only button aria-labels
