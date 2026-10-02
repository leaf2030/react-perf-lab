import { useSyncExternalStore } from 'react'

/**
 * 一个极简的「外部 store + 选择器订阅」实现，用来演示
 * Context 的性能问题该用什么方式绕过去（zustand / jotai 的核心原理）。
 */

export type Store<T> = {
  getState: () => T
  setState: (patch: Partial<T>) => void
  subscribe: (listener: () => void) => () => void
}

export function createStore<T extends object>(initialState: T): Store<T> {
  let state = initialState
  const listeners = new Set<() => void>()

  return {
    getState: () => state,
    setState(patch) {
      state = { ...state, ...patch }
      listeners.forEach((listener) => {
        listener()
      })
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

/**
 * 按选择器订阅 store。
 *
 * ⚠️ selector 必须返回「稳定的基本类型值」或稳定引用：
 *   ✅ useStoreSelector(store, s => s.user.name)
 *   ❌ useStoreSelector(store, s => ({ a: s.a, b: s.b }))  // 每次都是新对象 → 无限循环
 * 需要返回对象时，请配合 useMemo / shallow 比较，或拆成多次选择。
 */
export function useStoreSelector<T extends object, S>(store: Store<T>, selector: (state: T) => S): S {
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()))
}
