// ======== 应用根组件 ========
// INPUT: editorStore.isEditorReady + window.location.hash
// OUTPUT: 欢迎界面 / 编辑器布局；挂载 Toaster 与 ImportConfirmDialog
// POS: src/App.tsx — 应用入口视图路由 + URL 导入触发点

import { Toaster } from 'sonner'
import { useEditorStore } from './stores/editorStore'
import { WelcomeScreen } from './components/welcome/WelcomeScreen'
import { EditorLayout } from './components/layout/EditorLayout'
import { useImportFromURL } from './hooks/useImportFromURL'
import { ImportConfirmDialog } from './components/dialogs/ImportConfirmDialog'

function App() {
  const isEditorReady = useEditorStore((s) => s.isEditorReady)
  const { pending, accept, cancel } = useImportFromURL()

  return (
    <div className="h-screen bg-surface text-primary">
      {isEditorReady ? <EditorLayout /> : <WelcomeScreen />}
      <ImportConfirmDialog open={pending !== null} onConfirm={accept} onCancel={cancel} />
      <Toaster position="bottom-center" richColors />
    </div>
  )
}

export default App
