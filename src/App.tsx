// ======== 应用根组件 ========
// INPUT: editorStore.isEditorReady
// OUTPUT: 根据编辑器状态切换欢迎界面 / 编辑器布局
// POS: src/App.tsx — 应用入口视图路由

import { useEditorStore } from './stores/editorStore'
import { WelcomeScreen } from './components/welcome/WelcomeScreen'
import { EditorLayout } from './components/layout/EditorLayout'

function App() {
  const isEditorReady = useEditorStore((s) => s.isEditorReady)

  return (
    <div className="h-screen bg-surface text-primary">
      {isEditorReady ? <EditorLayout /> : <WelcomeScreen />}
    </div>
  )
}

export default App
