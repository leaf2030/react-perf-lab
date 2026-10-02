import type { ReactNode } from 'react'
import { currentShowBadges } from '../lib/settings'

type Props = {
  /** 组件名，显示在徽章里 */
  name: string
  /** 来自 useRenderCount 的渲染次数 */
  count: number
  /** 额外说明，比如 props 摘要 */
  note?: ReactNode
  tone?: 'default' | 'hot' | 'cool'
}

/**
 * 渲染次数徽章。
 *
 * 用 `key={count}` 让计数器这个 span 在数值变化时重新挂载，
 * 从而重放一次 CSS 动画（闪烁）—— 这样"谁重渲染了"在现场一眼可见。
 * 注意这里故意用了 key 重挂载，不引入额外 state，避免干扰被观测组件。
 *
 * 但要提醒听众：**观察工具本身也有成本**。
 * 这个徽章是一个独立组件，父组件每次渲染都会新建它的元素对象，
 * 所以它会跟着一起重渲染 —— 在某些对比 Demo 里甚至会先闪一次。
 * 顶栏的「渲染徽章」开关用的正是非响应式读取（currentShowBadges），
 * 关掉它不会引起任何额外渲染。
 */
export function RenderBadge({ name, count, note, tone = 'default' }: Props) {
  // 非响应式读取：徽章开关变化时不需要本组件重新「订阅」，
  // 它本来就是被观测组件的儿子，父组件一渲染它自然就跟着刷新了。
  if (!currentShowBadges()) return null

  return (
    <span className={`rbadge rbadge--${tone}`}>
      <span className="rbadge__name">{name}</span>
      <span className="rbadge__count" key={count}>
        ×{count}
      </span>
      {note ? <span className="rbadge__note">{note}</span> : null}
    </span>
  )
}
