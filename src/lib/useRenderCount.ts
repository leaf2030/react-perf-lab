import { useRef } from 'react'
import { perfSettings } from './settings'

/**
 * 统计某个组件被「渲染」了多少次。
 *
 * 已移除 StrictMode，这里的计数就是真实的渲染次数：每次更新渲染函数执行一次，计数 +1。
 */
export function useRenderCount(name: string): number {
  const renders = useRef(0)
  renders.current += 1

  if (perfSettings.get().logRenders) {
    console.log(`[render] ${name} ×${renders.current}`)
  }

  return renders.current
}
