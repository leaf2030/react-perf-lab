/**
 * 性能实验工具集。
 *
 * 真实项目里"昂贵渲染"通常来自：
 *  - 大数组的 filter / sort / map
 *  - 复杂图表 / 富文本 / 公式的计算
 *  - 深层递归、正则回溯、大量 DOM 结构生成
 *
 * 这里用一个确定性的同步忙等循环来"模拟"这份开销，
 * 好处是可以在页面上用滑块随时放大 / 缩小，方便现场演示卡顿。
 */

/** 大约每次迭代的开销，用于把「毫秒」换算成「迭代次数」 */
const ITERATIONS_PER_MS = 150_000

/** 模块级变量，防止 JS 引擎把循环优化掉 */
let sink = 0

/**
 * 模拟耗时 `ms` 毫秒的同步计算。
 * 注意：它是同步阻塞的，会卡住主线程 —— 这正是我们要演示的问题。
 */
export function simulateWork(ms: number): void {
  const iterations = Math.round(ms * ITERATIONS_PER_MS)
  for (let i = 0; i < iterations; i += 1) {
    sink = (sink + i) % 1_000_003
  }
}

/** 读一下 sink，确保上面的计算不会被判定为无用代码 */
export function peekSink(): number {
  return sink
}

export type Item = { id: number; label: string; price: number }

/** 生成一批用于列表演示的假数据 */
export function makeItems(count: number, prefix = 'Item'): Item[] {
  const items = new Array<Item>(count)
  for (let i = 0; i < count; i += 1) {
    items[i] = { id: i + 1, label: `${prefix} ${i + 1}`, price: ((i * 37) % 900) + 100 }
  }
  return items
}

/** 千分位格式化 */
export function formatNumber(value: number): string {
  return value.toLocaleString('en-US')
}

/** 把毫秒格式化成好看的样子 */
export function formatMs(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(2)} s`
  return `${value.toFixed(1)} ms`
}

/** 生成 0~1 的伪随机序列，保证每次刷新页面数据一致，便于对比 */
export function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}
