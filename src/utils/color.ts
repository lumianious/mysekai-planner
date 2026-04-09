// ======== 家具颜色分配 ========
// 根据主分类 ID 确定性地分配颜色，用于彩色矩形渲染

const GENRE_COLORS = [
  '#e06c75', '#98c379', '#e5c07b', '#61afef', '#c678dd',
  '#56b6c2', '#d19a66', '#be5046', '#7ec699', '#f0c674',
  '#81a2be', '#b294bb', '#8abeb7', '#cc6666', '#b5bd68',
  '#f0c674', '#81a2be', '#b294bb', '#8abeb7', '#a3685a',
  '#c5a3ff', '#ff8b94', '#86e3ce', '#d0e6a5', '#ffdd94',
  '#fa897b', '#ccabd8', '#b0d8dc', '#f6eac2', '#d4a5a5',
  '#a8e6cf', '#dcedc1', '#ffd3b6',
]

export function getFixtureColor(genreId: number, colorCode?: string): string {
  if (colorCode && colorCode.length > 0) return colorCode
  return GENRE_COLORS[genreId % GENRE_COLORS.length]
}
