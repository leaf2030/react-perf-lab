import { useSyncExternalStore } from 'react'

/**
 * 全局演示参数：用一个"外部 store + useSyncExternalStore"来实现。
 *
 * 这本身就是一个性能样板：把配置放在 React 之外，
 * 只有真正读取它的组件才会因为它的变化而重渲染，
 * 而不是像顶层 Context 那样"一人改，全家重渲染"。
 */

export type PerfSettings = {
  /** 单个组件「模拟渲染耗时」的毫秒数 */
  heavyMs: number
  /** 是否在控制台打印渲染日志 */
  logRenders: boolean
  /** 自增标记：变化时整个页面会重新挂载，用来一键重置所有渲染计数 */
  epoch: number
  /**
   * 是否显示「渲染次数徽章」。
   * 在「用 React.memo 优化前后对比」这类场景里，徽章本身就藏着陷阱：
   * 父组件每次渲染都会新建一个 <RenderBadge /> 元素，
   * 未 memo 的子组件会连带把徽章一起重渲染 ×2，出现「同一个组件闪两次」的假象。
   * 现场讲不清时，直接关掉徽章再对比一次，结论反而更干净。
   */
  showBadges: boolean
}

let settings: PerfSettings = {
  heavyMs: 6,
  logRenders: false,
  epoch: 0,
  showBadges: true,
}

const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => {
    listener()
  })
}

export const perfSettings = {
  get(): PerfSettings {
    return settings
  },
  set(patch: Partial<PerfSettings>) {
    settings = { ...settings, ...patch }
    emit()
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

/** 订阅「模拟耗时」 */
export function useHeavyMs(): number {
  return useSyncExternalStore(
    perfSettings.subscribe,
    () => settings.heavyMs,
  )
}

/** 订阅「是否打印渲染日志」 */
export function useLogRenders(): boolean {
  return useSyncExternalStore(
    perfSettings.subscribe,
    () => settings.logRenders,
  )
}

/** 订阅「重置计数」的标记 */
export function useEpoch(): number {
  return useSyncExternalStore(
    perfSettings.subscribe,
    () => settings.epoch,
  )
}

/** 订阅「是否显示渲染次数徽章」 */
export function useShowBadges(): boolean {
  return useSyncExternalStore(
    perfSettings.subscribe,
    () => settings.showBadges,
  )
}

/**
 * 非响应式读取：适合在渲染期间使用，不想因为拖动滑块而额外触发重渲染。
 *
 * 注意 `currentHeavyMs()` 与 `useHeavyMs()` 的区别 —— 这本身就是本课的案例：
 * 滑块每动一格都会 emit 一次，`useHeavyMs()` 的订阅者（顶栏）必然重渲染；
 * 而真正耗时的组件用 `currentHeavyMs()` 在渲染期直接读值，
 * 于是「调参」不会把整个页面拖下水。订阅范围越小，性能越好。
 */
export function currentHeavyMs(): number {
  return settings.heavyMs
}

/** 非响应式读取徽章开关（同上，避免开关一拨就全局重渲染） */
export function currentShowBadges(): boolean {
  return settings.showBadges
}
