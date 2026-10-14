import type { ReactNode } from 'react'

/**
 * 对比条（CompareBar）
 *
 * 把两个数字并排画成两根长度成比例的条，让"差多少"一眼可见。
 * 小白不需要理解毫秒，只需要看到"这根条是那根条的 20 倍长"。
 */
export function CompareBar({
  items,
  unit = 'ms',
  max,
}: {
  items: { label: string; value: number; tone: 'good' | 'bad' | 'warn' | 'default'; note?: ReactNode }[]
  unit?: string
  /** 手动指定满格值；不传则取最大值 */
  max?: number
}) {
  const peak = max ?? Math.max(...items.map((item) => item.value), 1)

  return (
    <div className="cmpbar">
      {items.map((item) => (
        <div className="cmpbar__row" key={item.label}>
          <span className="cmpbar__label">{item.label}</span>
          <div className="cmpbar__track">
            <div
              className={`cmpbar__fill cmpbar__fill--${item.tone}`}
              style={{ width: `${Math.max((item.value / peak) * 100, item.value > 0 ? 2 : 0)}%` }}
            />
          </div>
          <span className={`cmpbar__value cmpbar__value--${item.tone}`}>
            {item.value > 0 ? `${item.value.toFixed(0)} ${unit}` : '—'}
          </span>
          {item.note ? <span className="cmpbar__note">{item.note}</span> : null}
        </div>
      ))}
    </div>
  )
}
