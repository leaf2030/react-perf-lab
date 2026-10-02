import { lazy, memo, Suspense, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { DemoCard } from '../components/DemoCard'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { PageHeader, Panel } from '../components/PageHeader'
import { RenderBadge } from '../components/RenderBadge'
import { useRenderCount } from '../lib/useRenderCount'

/* =========================================================================
   Demo 1：静态引入 vs React.lazy
   ========================================================================= */

/** 演示开关：打开后人为延迟 1.2 秒，模拟慢速网络，方便现场看骨架屏 */
const network = { slow: true }

function loadChartChunk(): Promise<typeof import('../demo/HeavyChart')> {
  return import('../demo/HeavyChart').then(async (mod) => {
    if (network.slow) {
      await new Promise((resolve) => setTimeout(resolve, 1200))
    }
    return mod
  })
}

const LazyHeavyChart = lazy(loadChartChunk)

/**
 * 这个组件直接写在本文件里 → 它的代码会被打进「本页所在的 chunk」，
 * 用户打开这一页的时候就已经把它的代码下载下来了。
 * 换句话说：静态引入 = 用首屏体积换「点击时零等待」。
 */
const StaticHeavyWidget = memo(function StaticHeavyWidget() {
  const rows = useMemo(() => Array.from({ length: 300 }, (_, i) => `静态引入的第 ${i + 1} 行`), [])
  return (
    <div className="panel" style={{ marginBottom: 0 }}>
      <h4 className="panel__title">🧱 静态引入的重型组件</h4>
      <div style={{ maxHeight: 200, overflow: 'auto' }}>
        {rows.map((row) => (
          <div className="nrow" style={{ height: 28 }} key={row}>
            {row}
          </div>
        ))}
      </div>
      <p className="hint" style={{ marginBottom: 0 }}>
        代码已经在本页 chunk 里了，所以点击后「立刻」出现 —— 代价是首屏就得多下载它。
      </p>
    </div>
  )
})

function ChartSkeleton() {
  return (
    <div className="panel" style={{ marginBottom: 0, minHeight: 280 }}>
      <h4 className="panel__title">⏳ 正在下载图表 chunk…</h4>
      <div className="stack" style={{ marginTop: 12 }}>
        <div className="skeleton" style={{ width: '92%' }} />
        <div className="skeleton" style={{ width: '76%' }} />
        <div className="skeleton" style={{ width: '84%' }} />
        <div className="skeleton" style={{ width: '58%' }} />
      </div>
      <p className="hint">这就是 Suspense 的 fallback：先给用户看骨架，而不是白屏。</p>
    </div>
  )
}

function SplitDemo() {
  const [showStatic, setShowStatic] = useState(false)
  const [showLazy, setShowLazy] = useState(false)
  const [loadMs, setLoadMs] = useState<number | null>(null)
  const [slow, setSlow] = useState(network.slow)

  function toggleSlow(next: boolean) {
    network.slow = next
    setSlow(next)
  }

  function startLazy() {
    const started = performance.now()
    setShowLazy(true)
    loadChartChunk()
      .then(() => setLoadMs(performance.now() - started))
      .catch(() => setLoadMs(-1))
  }

  return (
    <div className="stack">
      <div className="row">
        <label className="switch">
          <input type="checkbox" checked={slow} onChange={(event) => toggleSlow(event.target.checked)} />
          <span>模拟慢速网络（延迟 1.2s）</span>
        </label>
        <span className="hint">chunk 一旦加载过就会被浏览器缓存，想看效果请刷新页面</span>
      </div>

      <div className="grid-2">
        <div className="stack">
          <div className="row">
            <button type="button" className="btn" onClick={() => setShowStatic((v) => !v)}>
              {showStatic ? '卸载' : '渲染'}静态组件
            </button>
          </div>
          {showStatic ? <StaticHeavyWidget /> : <p className="hint">点上面的按钮试试（瞬间出现）</p>}
        </div>

        <div className="stack">
          <div className="row">
            <button type="button" className="btn btn--primary" onClick={startLazy} disabled={showLazy}>
              加载并渲染懒加载组件
            </button>
            {loadMs !== null ? (
              <span className="hint">实测 chunk 下载 + 执行：{loadMs.toFixed(0)} ms</span>
            ) : null}
          </div>
          {showLazy ? (
            <ErrorBoundary>
              <Suspense fallback={<ChartSkeleton />}>
                <LazyHeavyChart title="懒加载进来的图表" />
              </Suspense>
            </ErrorBoundary>
          ) : (
            <p className="hint">点上面的按钮试试（先看到骨架屏，再出现图表）</p>
          )}
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   Demo 2：预加载 —— 把「等待」提前到用户点击之前
   ========================================================================= */

function PreloadDemo() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready'>('idle')
  const [cost, setCost] = useState(0)
  const started = useRef(false)

  function preload() {
    if (started.current) return
    started.current = true
    setStatus('loading')
    const begin = performance.now()
    void import('./ComparePage').then(() => {
      setStatus('ready')
      setCost(performance.now() - begin)
    })
  }

  return (
    <div className="stack">
      <div className="row">
        <Link
          to="/compare"
          className="btn btn--primary"
          onMouseEnter={preload}
          onFocus={preload}
          onTouchStart={preload}
        >
          进入「Vue ↔ React 对照」页 →
        </Link>
        <span className="hint">
          {status === 'idle'
            ? '把鼠标悬停在这个按钮上（不要点），就会开始预加载目标路由的 chunk'
            : status === 'loading'
              ? '正在后台预加载 chunk…'
              : `✅ chunk 已就绪（用时 ${cost.toFixed(0)} ms），现在点击会瞬间打开`}
        </span>
      </div>
      <p className="hint">
        这是真实可用的技巧：目标路由的 chunk 就是左侧菜单里那个页面。刷新页面后先别点左侧菜单，直接把鼠标停在这个按钮上，
        再打开 Network 面板对比一下「有没有预加载」的差别。
      </p>
    </div>
  )
}

/* =========================================================================
   Demo 3：加载失败 + 重试
   ========================================================================= */

let loadCount = 0

/**
 * 一个「一定会失败」的 loader。
 *
 * 为什么用 attempt 而不是一个全局开关：StrictMode 会让组件渲染两次，
 * 任何"只失败一次"的全局标记都会被第一次（可能被丢弃的）渲染消耗掉，演示结果就不稳定了。
 */
function makeFaultyLoader(attempt: number) {
  return () => {
    loadCount += 1
    if (attempt === 0) {
      return Promise.reject<typeof import('../demo/HeavyChart')>(
        new Error(`模拟网络中断：chunk 加载失败（第 ${loadCount} 次尝试）`),
      )
    }
    return import('../demo/HeavyChart')
  }
}

function FaultTolerantDemo() {
  const [attempt, setAttempt] = useState(0)

  // attempt 变化时创建一个全新的 lazy 组件，React 才会重新执行 loader
  // （React 会记住一个 lazy 组件的失败状态，不换新的实例，重试就是空转）
  // 这个工程用 oxlint，禁用语法是 oxlint-disable-next-line（不是 eslint-disable，写了不生效）
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  const FlakyChart = useMemo(() => lazy(makeFaultyLoader(attempt)), [attempt])
  const renders = useRenderCount('FaultTolerantDemo')

  return (
    <div className="stack">
      <div className="row">
        <RenderBadge name="FaultTolerantDemo" count={renders} note={`attempt = ${attempt}`} />
        <button type="button" className="btn" onClick={() => setAttempt((value) => value + 1)}>
          手动重试一次
        </button>
      </div>

      <ErrorBoundary
        key={attempt}
        onReset={() => setAttempt((value) => value + 1)}
        fallback={(error, reset) => (
          <div className="panel panel--bad" style={{ marginBottom: 0 }}>
            <h4 className="panel__title">😵 图表加载失败</h4>
            <p className="hint">{error.message}</p>
            <button type="button" className="btn btn--primary" onClick={reset}>
              重试（会重新拉取 chunk）
            </button>
          </div>
        )}
      >
        <Suspense fallback={<ChartSkeleton />}>
          {/* 重试必须换成一个新的 lazy 组件，所以这里刻意在 render 期间创建组件 */}
          {/* oxlint-disable-next-line react/no-unstable-nested-components */}
          <FlakyChart title="重试之后成功加载的图表" />
        </Suspense>
      </ErrorBoundary>

      <p className="hint">
        真实世界的对应场景：发版后旧的 chunk 文件被删掉了，用户还停留在老页面，点击时 404 ——
        没有错误边界的表现就是整页白屏。配合「重试」或「刷新页面」的提示。
      </p>
    </div>
  )
}

/* =========================================================================
   页面
   ========================================================================= */

export default function SplitPage() {
  return (
    <>
      <PageHeader
        index="06"
        title="代码分割与懒加载"
        subtitle="前面几章优化的是「渲染」，这一章优化的是「加载」。首屏只要更少的 JS，用户看到内容就更早 —— 这是体感提升最明显的一章。"
        tags={['React.lazy', 'Suspense', '路由分包', '预加载']}
      />

      <Panel title="先看一组观念上的区别">
        <ul className="checklist">
          <li>
            <b>渲染优化</b>解决「页面已经打开，但操作卡顿」；<b>加载优化</b>解决「页面迟迟打不开」。
          </li>
          <li>
            Vue 里对应的是 <code>defineAsyncComponent</code> 和路由的懒加载，思路完全一样：把「现在不需要的代码」推迟到需要的时候再下载。
          </li>
          <li>
            现代构建工具（Vite/Rollup）会把每一个 <code>import()</code> 拆成独立文件。所以「代码分割 = 决定在哪里切断依赖图」。
          </li>
          <li>
            本项目左侧菜单里除了首页以外的每一章，都是懒加载的路由 —— 打开 Network 面板切换章节，就能看到一章一个 js 文件。
          </li>
        </ul>
      </Panel>

      <DemoCard
        title="Demo 1｜静态引入 vs React.lazy"
        tag="核心对比"
        tone="default"
        desc="左边是本文件里直接定义的组件（随本页 chunk 一起下载），右边是 React.lazy 引入的独立 chunk。"
        points={[
          '静态引入：点击时零等待，但用户打开这一页就已经下载了这些代码 —— 首屏体积更大、解析更慢。',
          'lazy 引入：代码单独成一个文件，只有真正渲染时才下载；配合 Suspense，用户看到的是骨架屏而不是白屏。',
          '右边的「实测 chunk 下载 + 执行」耗时 —— 才是真实用户会等待的时间。',
          '判断标准：首屏必须看到的组件用静态引入；「点击/切页/弹窗才会出现」的组件用 lazy。',
        ]}
        code={`// ❌ 首屏用不到的组件，别静态引入
import HeavyEditor from './HeavyEditor'

// ✅ 拆成独立 chunk，用到时再下载
const HeavyEditor = lazy(() => import('./HeavyEditor'))

// 命名导出要转一下
const Editor = lazy(() =>
  import('./editor').then((mod) => ({ default: mod.HeavyEditor })),
)

// Suspense 的位置决定了「哪儿会出现骨架屏」
<Suspense fallback={<EditorSkeleton />}>
  {open ? <HeavyEditor /> : null}
</Suspense>`}
      >
        <SplitDemo />
      </DemoCard>

      <DemoCard
        title="Demo 2｜预加载：把等待提前到点击之前"
        tag="体验优化"
        tone="good"
        desc="鼠标悬停时就开始下载目标 chunk。用户从「悬停」到「真的点击」之间通常有 200~500ms，足够把 chunk 拉回来了。"
        points={[
          '原理很简单：动态 import() 的返回值会被浏览器缓存，提前调用一次就够了。',
          '触发时机：hover / focus / touchstart（移动端没有 hover）/ 空闲时间（requestIdleCallback）。',
          '进阶：用 React 19 的 preload API 或者 <link rel="prefetch"> 让浏览器在空闲时预取。',
          '⚠️ 别滥用：预加载太多会让首屏带宽被抢占，反而拖慢关键资源。只预加载「用户大概率会去的下一个页面」。',
        ]}
        codeTone="good"
        code={`// 1. 把 chunk 的加载封装成一个可复用的函数
const loadComparePage = () => import('./ComparePage')

// 2. React.lazy 也复用它（共享同一个 promise，不会重复请求）
const ComparePage = lazy(loadComparePage)

// 3. 用户一悬停就提前加载
<Link
  to="/compare"
  onMouseEnter={loadComparePage}
  onFocus={loadComparePage}
>
  进入对照页
</Link>`}
      >
        <PreloadDemo />
      </DemoCard>

      <DemoCard
        title="Demo 3｜加载失败怎么办：错误边界 + 重试"
        tag="容易被忽略的健壮性"
        tone="bad"
        desc="这个 loader 第一次必定失败（点多少次「重试」都是第一次那个状态），只有真的重试才会成功。"
        points={[
          'React.lazy 的 loader 抛出异常时，必须有 ErrorBoundary 接住，否则错误会一路冒泡导致整页卸载（白屏）。',
          '为什么需要重试：一次网络抖动、或者发版后旧 chunk 已经不存在了，用户重试往往就好了。',
          '重试的实现要点：要创建一个全新的 lazy 组件（或者重新挂载子树），React 才会重新执行 loader —— 它会记住上一次的失败状态。',
          '再进一步：可以监听 chunk 加载失败的全局事件，提示用户「有新版本，请刷新页面」。',
        ]}
        code={`const Chart = lazy(() => import('./Chart'))

function Widget() {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <div>
          <p>加载失败：{error.message}</p>
          <button onClick={reset}>重试</button>
        </div>
      )}
    >
      <Suspense fallback={<Skeleton />}>
        <Chart />
      </Suspense>
    </ErrorBoundary>
  )
}`}
      >
        <FaultTolerantDemo />
      </DemoCard>

      <Panel title="路由级分包：本项目就是这么做的">
        <p className="hint">
          运行 <code>npm run build</code>，命令行会列出每个 chunk 的体积。你会看到首页很小，
          每一章各自成为一个文件 —— 用户第一次打开只下载「首页 + 框架」。
        </p>
        <table className="table">
          <thead>
            <tr>
              <th>切片方式</th>
              <th>说明</th>
              <th>推荐度</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>路由级（每个页面一个 chunk）</td>
              <td>收益最大、实现最简单，配合 Suspense 展示页面骨架</td>
              <td>⭐⭐⭐⭐⭐</td>
            </tr>
            <tr>
              <td>体积大的第三方库</td>
              <td>图表、富文本编辑器、地图、PDF 预览等，用的时候再加载</td>
              <td>⭐⭐⭐⭐⭐</td>
            </tr>
            <tr>
              <td>弹窗 / 抽屉 / 复杂表单</td>
              <td>首屏看不到的组件，适合懒加载</td>
              <td>⭐⭐⭐⭐</td>
            </tr>
            <tr>
              <td>细碎的分包（每个小组件都 lazy）</td>
              <td>请求数变多、瀑布式加载，反而更慢</td>
              <td>⭐ 不推荐</td>
            </tr>
          </tbody>
        </table>
      </Panel>

      <Panel title="落地清单">
        <ul className="checklist">
          <li>路由全部改成 lazy，并把 Suspense 放在布局层（本项目在 Layout.tsx 里）。</li>
          <li>给每个懒加载块配一个「体积相当」的骨架屏，避免加载完成时的页面跳动。</li>
          <li>所有 lazy 组件外面都套 ErrorBoundary，尤其是发版频繁的项目。</li>
          <li>
            用 <code>npm run build</code> 看产物；如果某个 chunk 超过 200KB（gzip 前），先怀疑是不是误引入了整个库。
          </li>
          <li>
            进阶：把 <code>React.lazy</code> 换成 <code>React.lazy</code> + 预加载的组合，或者考虑路由框架自带的预加载能力。
          </li>
        </ul>
      </Panel>
    </>
  )
}
