// ======== 分享按钮 ========
// INPUT: useEditorStore 切片 (placedItems, placedEdges, areaLevel)
// OUTPUT: 单击将编码后的蓝图 URL 写入剪贴板并弹 toast
// POS: src/components/toolbar/ShareButton.tsx — Toolbar 工具组件

import { Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { useEditorStore } from '../../stores/editorStore'
import { encodeBlueprint } from '../../persistence/encodeBlueprint'
import { ToolButton } from './ToolButton'

export function ShareButton() {
  const handleShare = async () => {
    const { placedItems, placedEdges, areaLevel } = useEditorStore.getState()
    const encoded = encodeBlueprint({ placedItems, placedEdges, areaLevel })
    const url = `${window.location.origin}${window.location.pathname}#${encoded}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('蓝图链接已复制到剪贴板')
    } catch {
      toast.error(`复制失败 — 链接长度 ${url.length} 字符`)
    }
  }
  return (
    <ToolButton
      icon={Share2}
      label="分享链接"
      isActive={false}
      onClick={handleShare}
    />
  )
}
