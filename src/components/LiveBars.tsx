/**
 * 跳动柱形图（LiveBars）
 *
 * 小白看不懂"卡不卡"，但看得懂"柱子突然变高变红"。
 *
 * 这个组件把一串采样值画成会跳动的柱子：
 *  - 每次新样本进来，柱子从右侧推入，旧的向左移出
 *  - 超过阈值的柱子自动变黄 / 变红
 *  - 鼠标悬停能看到具体数值
 *
 * 和 InputLagProbe 里的柱状图是同一套视觉语言，
 * 但这里做成通用组件，任何"一串数字"都能直接丢进来。
 */
export function LiveBars({
  /** 采样值数组（最新的在最后） */
  values,
  /** 满格对应的数值，用来算柱高 */
  max = 500,
  /** 超过这个值变黄 */
  warnAt = 60,
  /** 超过这个值变红 */
  badAt = 200,
  /** 柱子数量上限，超出后只保留最新的 */
  capacity = 24,
  /** 单位，用于 tooltip */
  unit = 'ms',
  /** 空状态提示 */
  emptyText = '还没有采样',
  /** 高度（px） */
  height = 56,
}: {
  values: number[]
  max?: number
  warnAt?: number
  badAt?: number
  capacity?: number
  unit?: string
  emptyText?: string
  height?: number
}) {
  const shown = values.slice(-capacity)

  return (
    <div className="livebars" style={{ height }}>
      {shown.length === 0 ? (
        <span className="livebars__empty">{emptyText}</span>
      ) : (
        shown.map((value, index) => {
          const tone = value > badAt ? 'bad' : value > warnAt ? 'warn' : 'good'
          return (
            <span
              key={index}
              className={`livebars__bar livebars__bar--${tone}`}
              style={{ height: `${Math.max(4, Math.min(100, (value / max) * 100))}%` }}
              title={`${value.toFixed(0)} ${unit}`}
            />
          )
        })
      )}
    </div>
  )
}
