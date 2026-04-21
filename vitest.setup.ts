// ======== Vitest 全局 setup ========
// POS: vitest.setup.ts — 在每个测试文件执行前运行
//
// 背景：Node 22+ 内置了一个不完整的 localStorage/sessionStorage 全局
// （需 --localstorage-file 才能激活真实实现），且该残缺对象会同时覆盖 jsdom
// 提供的 Storage 实现。Zustand persist 中间件需要标准 Web Storage API
// （setItem/getItem/removeItem/clear/length/key），因此这里提供一个最小的
// 内存 Storage polyfill 并强制覆盖 globalThis / window 上的所有绑定。

class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length(): number {
    return this.store.size
  }
  clear(): void {
    this.store.clear()
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null
  }
  removeItem(key: string): void {
    this.store.delete(key)
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value))
  }
}

const localStoragePolyfill = new MemoryStorage()
const sessionStoragePolyfill = new MemoryStorage()

function installStorage(
  target: Record<string, unknown> | undefined,
  name: 'localStorage' | 'sessionStorage',
  value: Storage,
): void {
  if (!target) return
  try {
    Object.defineProperty(target, name, {
      value,
      writable: true,
      configurable: true,
    })
  } catch {
    // 若属性不可配置则尝试直接赋值
    ;(target as Record<string, unknown>)[name] = value
  }
}

installStorage(
  globalThis as unknown as Record<string, unknown>,
  'localStorage',
  localStoragePolyfill,
)
installStorage(
  globalThis as unknown as Record<string, unknown>,
  'sessionStorage',
  sessionStoragePolyfill,
)
if (typeof window !== 'undefined') {
  installStorage(
    window as unknown as Record<string, unknown>,
    'localStorage',
    localStoragePolyfill,
  )
  installStorage(
    window as unknown as Record<string, unknown>,
    'sessionStorage',
    sessionStoragePolyfill,
  )
}
