// ======== 导出按钮 ========
// INPUT: useEditorStore 切片 (placedItems, placedEdges, areaLevel)
// OUTPUT: 点击打开 ExportDialog，显示 encodeBlueprint 生成的代码
// POS: src/components/toolbar/ExportButton.tsx — Toolbar 工具组件

import { useState } from 'react'
import { Share2 } from 'lucide-react'
import { useEditorStore } from '../../stores/editorStore'
import { encodeBlueprint } from '../../persistence/encodeBlueprint'
import { ToolButton } from './ToolButton'
import { ExportDialog } from '../dialogs/ExportDialog'

export function ExportButton() {
  const [code, setCode] = useState<string | null>(null)

  const handleOpen = () => {
    const { placedItems, placedEdges, areaLevel } = useEditorStore.getState()
    setCode(encodeBlueprint({ placedItems, placedEdges, areaLevel }))
  }

  return (
    <>
      <ToolButton
        icon={Share2}
        label="导出代码"
        isActive={false}
        onClick={handleOpen}
      />
      <ExportDialog
        open={code !== null}
        code={code ?? ''}
        onClose={() => setCode(null)}
      />
    </>
  )
}
