import type { ReactNode } from 'react'
import { currentHeavyMs } from '../lib/settings'
import { simulateWork } from '../lib/perf'
import { useRenderCount } from '../lib/useRenderCount'
import { RenderBadge } from './RenderBadge'

type Props = {
  name: string
  /** 覆盖全局「模拟耗时」；不传就用顶部滑块的值 */
  ms?: number
  note?: ReactNode
  children?: ReactNode
}

/**
 * 一个「渲染很贵」的组件。
 *
 * 它在 render 期间同步执行耗时计算 —— 这是在演示里制造卡顿的手段。
 * 现实中的等价物：重新计算派生数据、重新渲染大子树、在 render 里做 IO 等。
 */
export function HeavyBox({ name, ms, note, children }: Props) {
  const count = useRenderCount(name)
  const cost = ms ?? currentHeavyMs()

  if (cost > 0) {
    simulateWork(cost)
  }

  return (
    <div className="heavy">
      <RenderBadge name={name} count={count} note={note ?? `render 内耗时 ≈${cost}ms`} />
      {children ? <div className="heavy__body">{children}</div> : null}
    </div>
  )
}

type LightProps = {
  name: string
  note?: ReactNode
  children?: ReactNode
}

/** 一个「渲染很便宜」的组件，用来做对照 */
export function LightBox({ name, note, children }: LightProps) {
  const count = useRenderCount(name)
  return (
    <div className="heavy heavy--light">
      <RenderBadge name={name} count={count} note={note} tone="cool" />
      {children ? <div className="heavy__body">{children}</div> : null}
    </div>
  )
}
