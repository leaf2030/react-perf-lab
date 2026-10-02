import { useRef } from 'react'
import { perfSettings } from './settings'

/**
 * 统计某个组件被「渲染」了多少次。
 *
 * 重要提示：开发环境 + <StrictMode> 下，React 会故意双调用渲染函数以帮助你
 * 发现副作用问题，所以这里看到的次数会比生产环境偏大。
 * 演示时只需要对比「谁涨了、谁没涨」，绝对值不重要。
 */
export function useRenderCount(name: string): number {
  const renders = useRef(0)
  renders.current += 1

  if (perfSettings.get().logRenders) {
    console.log(`[render] ${name} ×${renders.current}`)
  }

  return renders.current
}
