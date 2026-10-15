import { useRef } from 'react'

/**
 * 统计某个组件被「渲染」了多少次。
 *
 * 已移除 StrictMode，这里的计数就是真实的渲染次数：每次更新渲染函数执行一次，计数 +1。
 * 每次渲染都会在控制台打印一行，方便现场演示「谁在渲染、按什么顺序渲染」。
 */
export function useRenderCount(name: string): number {
  const renders = useRef(0)
  renders.current += 1

  console.log(`[render] ${name} ×${renders.current}`)

  return renders.current
}
