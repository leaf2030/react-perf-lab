import { useMemo } from 'react'
import { pseudoRandom } from '../lib/perf'
import { useRenderCount } from '../lib/useRenderCount'

/**
 * 一个「体积不小 + 渲染不便宜」的图表组件。
 *
 * 它被 SplitPage 用两种方式引入：
 *   ① 静态 import  —— 会打进当前 chunk
 *   ② React.lazy   —— 单独一个 chunk，点击时才下载（打开 Network 面板看 .js 文件）
 */

const POINT_COUNT = 8_000

/** 模块级就生成一份数据集：这也是真实项目的常见做法（比如内置的配色表、字典） */
const SERIES: number[] = (() => {
  const values = new Array<number>(POINT_COUNT)
  for (let i = 0; i < POINT_COUNT; i += 1) {
    values[i] = Math.sin(i / 240) * 42 + Math.sin(i / 31) * 9 + pseudoRandom(i) * 6
  }
  return values
})()

/** 把 8000 个点拼成一条 SVG 路径 —— 字符串拼接本身就不便宜 */
function buildPath(values: number[], width: number, height: number): string {
  const step = width / (values.length - 1)
  const parts = new Array<string>(values.length)
  for (let i = 0; i < values.length; i += 1) {
    const x = i * step
    const y = height / 2 - values[i]
    parts[i] = `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`
  }
  return parts.join(' ')
}

type Props = {
  title: string
  /** 是否显示标记点（标记点很占 DOM，默认只画少量） */
  markers?: number
}

export default function HeavyChart({ title, markers = 24 }: Props) {
  const renders = useRenderCount('HeavyChart')

  const path = useMemo(() => buildPath(SERIES, 600, 200), [])

  const dots = useMemo(() => {
    const step = Math.floor(SERIES.length / markers)
    return new Array(markers).fill(0).map((_, index) => {
      const i = index * step
      return { x: (i * 600) / (SERIES.length - 1), y: 100 - SERIES[i], key: i }
    })
  }, [markers])

  return (
    <div className="panel" style={{ marginBottom: 0 }}>
      <div className="row row--between">
        <h4 className="panel__title" style={{ margin: 0 }}>
          📈 {title}
        </h4>
        <span className="tag">渲染 ×{renders}</span>
      </div>

      <svg viewBox="0 0 600 200" style={{ width: '100%', height: 200, marginTop: 8 }}>
        <defs>
          <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#61dafb" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#61dafb" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" y1="100" x2="600" y2="100" stroke="#ffffff14" strokeWidth="1" />
        <path d={`${path} L600 200 L0 200 Z`} fill="url(#chart-fill)" />
        <path d={path} fill="none" stroke="#61dafb" strokeWidth="1.6" />
        {dots.map((dot) => (
          <circle key={dot.key} cx={dot.x} cy={dot.y} r="2.4" fill="#a78bfa" />
        ))}
      </svg>

      <p className="hint" style={{ marginBottom: 0 }}>
        这个组件包含 {POINT_COUNT.toLocaleString()} 个数据的路径计算，独立打包后是一个单独的文件。
      </p>
    </div>
  )
}
