import { memo, useDeferredValue, useMemo, useState, useTransition } from 'react'
import { DemoCard } from '../components/DemoCard'
import { PageHeader, Panel } from '../components/PageHeader'
import { RenderBadge } from '../components/RenderBadge'
import { Segmented } from '../components/Segmented'
import { makeItems, simulateWork, type Item } from '../lib/perf'
import { useRenderCount } from '../lib/useRenderCount'

/** 故意做得很慢的一批数据：5000 条里筛出来的结果都要渲染 */
const ALL_ITEMS: Item[] = makeItems(5000)

const MAX_ROWS = 200

/** 渲染开销固定 60ms：不管顶栏滑块怎么调，这一章的现象都稳定复现 */
const RENDER_COST_MS = 60

const SlowList = memo(function SlowList({ items, label }: { items: Item[]; label: string }) {
  const renders = useRenderCount('SlowList')

  const started = performance.now()
  simulateWork(RENDER_COST_MS)
  const cost = performance.now() - started

  return (
    <div className="stack" style={{ gap: 8 }}>
      <RenderBadge name={`SlowList（${label}）`} count={renders} note={`本次 render ≈ ${cost.toFixed(0)} ms`} />
      <div style={{ maxHeight: 220, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
        {items.map((item) => (
          <div className="nrow" style={{ height: 30 }} key={item.id}>
            <span>
              <b>#{item.id}</b> {item.label}
            </span>
            <span className="vrow__price">¥{item.price}</span>
          </div>
        ))}
      </div>
      <span className="hint">实际渲染 {items.length} 行（最多 {MAX_ROWS} 行）</span>
    </div>
  )
})

/* =========================================================================
   Demo 1：useDeferredValue
   ========================================================================= */

function DeferredValueDemo() {
  const renders = useRenderCount('DeferredValueDemo')
  const [keyword, setKeyword] = useState('')
  const [mode, setMode] = useState<'plain' | 'deferred'>('plain')

  const deferredKeyword = useDeferredValue(keyword)
  const effectiveKeyword = mode === 'deferred' ? deferredKeyword : keyword
  const isStale = mode === 'deferred' && keyword !== deferredKeyword

  const filtered = useMemo(() => {
    const key = effectiveKeyword.trim().toLowerCase()
    const matched = key ? ALL_ITEMS.filter((item) => item.label.toLowerCase().includes(key)) : ALL_ITEMS
    return matched.slice(0, MAX_ROWS)
  }, [effectiveKeyword])

  return (
    <div className="stack">
      <div className="row">
        <Segmented
          ariaLabel="渲染策略"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'plain', label: '直接用 keyword' },
            { value: 'deferred', label: 'useDeferredValue' },
          ]}
        />
        <RenderBadge name="DeferredValueDemo" count={renders} />
      </div>

      <div className="row">
        <input
          type="text"
          value={keyword}
          style={{ minWidth: 280 }}
          placeholder="快速打字试试：1234567890"
          onChange={(event) => setKeyword(event.target.value)}
        />
        <span className="hint">
          输入框里的值：<b style={{ color: 'var(--accent)' }}>{keyword || '（空）'}</b>
        </span>
        <span className="hint">
          列表实际使用的值：
          <b style={{ color: isStale ? 'var(--warn)' : 'var(--good)' }}>{effectiveKeyword || '（空）'}</b>
          {isStale ? ' ← 正在追赶（低优先级渲染中）' : ''}
        </span>
      </div>

      <SlowList items={filtered} label={mode === 'deferred' ? 'deferred' : 'plain'} />

      <p className="hint">
        切到「直接用 keyword」快速打字：输入框会被后面的列表渲染拖住，打字一卡一卡的。
        切到「useDeferredValue」再打：输入框立刻响应，列表稍慢一步跟上 —— 用时延换了流畅度。
      </p>
    </div>
  )
}

/* =========================================================================
   Demo 2：useTransition
   ========================================================================= */

const TABS = [
  { id: 'overview', label: '概览（轻）', heavy: false },
  { id: 'report', label: '数据报表（重）', heavy: true },
  { id: 'settings', label: '设置（轻）', heavy: false },
] as const

type TabId = (typeof TABS)[number]['id']

const HeavyReport = memo(function HeavyReport() {
  const renders = useRenderCount('HeavyReport')
  const started = performance.now()
  simulateWork(120)
  const cost = performance.now() - started
  const rows = useMemo(() => Array.from({ length: 80 }, (_, i) => `指标 ${i + 1}`), [])

  return (
    <div className="stack" style={{ gap: 8 }}>
      <RenderBadge name="HeavyReport" count={renders} note={`本次 render ≈ ${cost.toFixed(0)} ms`} />
      <div className="grid-3">
        {rows.map((row) => (
          <div className="stat" key={row}>
            <span className="stat__label">{row}</span>
            <span className="stat__value">{(Math.abs(Math.sin(row.length)) * 1000).toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  )
})

function TransitionDemo() {
  const [tab, setTab] = useState<TabId>('overview')
  const [withTransition, setWithTransition] = useState(true)
  const [isPending, startTransition] = useTransition()
  const renders = useRenderCount('TransitionDemo')

  function select(next: TabId) {
    if (withTransition) {
      startTransition(() => setTab(next))
    } else {
      setTab(next)
    }
  }

  const activeTab = TABS.find((item) => item.id === tab)

  return (
    <div className="stack">
      <div className="row">
        <label className="switch">
          <input
            type="checkbox"
            checked={withTransition}
            onChange={(event) => setWithTransition(event.target.checked)}
          />
          <span>用 startTransition 包裹这次切换</span>
        </label>
        <RenderBadge name="TransitionDemo" count={renders} />
        {isPending ? (
          <span className="tag tag--soft" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}>
            isPending = true（新内容正在后台渲染，旧内容仍然可交互）
          </span>
        ) : null}
      </div>

      <div className="segmented">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === tab ? 'segmented__btn is-active' : 'segmented__btn'}
            onClick={() => select(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="panel" style={{ marginBottom: 0, minHeight: 140 }}>
        <h4 className="panel__title">当前标签：{activeTab?.label}</h4>
        {tab === 'report' ? <HeavyReport /> : <p className="hint">这个标签的内容很轻，切换是瞬时的。</p>}
      </div>

      <p className="hint">
        关掉开关，从「概览」切到「数据报表」：界面会直接冻住大约 100ms（点完什么都不动，因为渲染是同步的）。
        打开开关再切一次：标签立刻变成选中态，报表在后台慢慢渲染，期间页面还能点、还能滚动。
      </p>
    </div>
  )
}

/* =========================================================================
   页面
   ========================================================================= */

export default function ConcurrentPage() {
  return (
    <>
      <PageHeader
        index="07"
        title="并发渲染特性"
        subtitle="useTransition 和 useDeferredValue 是 React 18 给的两个「体感优化」利器：它们不会让渲染变快，但能让重要的交互不被慢渲染挡住。"
        tags={['useTransition', 'useDeferredValue', '并发渲染', '可中断渲染']}
      />

      <Panel title="并发渲染到底改变了什么">
        <ul className="checklist">
          <li>
            在并发模式下，一次渲染可以被<b>中断、丢弃、重来</b>。React 因此可以做到：先把输入框这种高优先级更新做完，再去渲染那个慢列表。
          </li>
          <li>
            这不会减少总的工作量（该算的还是要算），但它把「主线程被一个慢渲染占满」变成了「重要的更新先插队」。
          </li>
          <li>
            对照 Vue：Vue 的更新是微任务队列 + 调度器，也有优先级概念（比如 <code>v-if</code> 的更新优先级更高），
            只是 Vue 的模板编译让它默认就很轻，所以这类 API 在 Vue 里存在感不强。
          </li>
          <li>
            <code>useTransition</code>：主动把一次更新标记为「低优先级」。<br />
            <code>useDeferredValue</code>：把某个值「延迟」一个版本，让依赖它的慢组件用旧值先渲染一次。
          </li>
        </ul>
      </Panel>

      <DemoCard
        title="Demo 1｜useDeferredValue：输入框永远跟手"
        tag="最高频的使用场景"
        tone="good"
        desc="5000 条数据筛选 + 一个固定 60ms 的慢列表。切换两种策略，快速打字感受区别。"
        points={[
          '慢的是「列表」，快的是「输入框」。我们要做的是让两者解耦。',
          'useDeferredValue 返回一个「滞后版本」的值：第一次渲染用旧值（不阻塞输入），随后 React 会在空闲时用新值再渲染一次。',
          '它不是 debounce：没有固定延时，React 会在空闲的第一时间把新值补上，节奏跟着渲染压力走。',
          '这个 Demo 里 SlowList 必须是 memo 的，否则每次输入都会重渲染它，deferred 也就白做了。',
        ]}
        codeTone="good"
        code={`function Search() {
  const [keyword, setKeyword] = useState('')
  // keyword 立刻变，deferredKeyword 慢一步变
  const deferredKeyword = useDeferredValue(keyword)

  const results = useMemo(() => filter(bigList, deferredKeyword), [deferredKeyword])

  return (
    <>
      {/* 输入框用即时值 → 永远跟手 */}
      <input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
      <SlowList items={results} />
    </>
  )
}`}
      >
        <DeferredValueDemo />
      </DemoCard>

      <DemoCard
        title="Demo 2｜useTransition：让慢操作「后台化」"
        tag="切换、筛选、路由跳转"
        tone="good"
        desc="切换到一个渲染耗时 120ms 的标签页。开关决定这次更新是不是低优先级。"
        points={[
          'startTransition 里的更新是「可中断」的：如果用户又点了别的按钮，这次渲染会被丢弃，不会白干。',
          'isPending 是它的配套能力：旧界面保持可交互 + 一个 loading 提示，体验比「整页冻结」好得多。',
          '区别于 Suspense：Suspense 是「数据没到 → 显示 fallback」；transition 是「数据有了，但渲染很慢 → 先保持旧界面」。',
          '注意：如果这次更新是由用户输入触发的（受控输入），不要用 startTransition 包，否则输入框会变慢 —— 那种场景用 useDeferredValue。',
        ]}
        codeTone="good"
        code={`const [isPending, startTransition] = useTransition()

function switchTab(next) {
  // 高优先级：标签的选中样式立刻更新
  setActiveTab(next)

  // 低优先级：内容渲染慢慢来，可以被中断
  startTransition(() => {
    setContent(next)
  })
}

return (
  <>
    <Tabs active={activeTab} onChange={switchTab} />
    {isPending && <Spinner />}
    <Content />
  </>
)`}
      >
        <TransitionDemo />
      </DemoCard>

      <Panel title="useDeferredValue vs 手写 debounce">
        <table className="table">
          <thead>
            <tr>
              <th>维度</th>
              <th>useDeferredValue</th>
              <th>debounce / throttle</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>触发时机</td>
              <td>React 空闲时立刻补上，自适应机器性能</td>
              <td>固定延时（比如 300ms），机器快也要等</td>
            </tr>
            <tr>
              <td>额外状态</td>
              <td>不需要，只是一个值</td>
              <td>需要维护定时器和一个「延迟值」state</td>
            </tr>
            <tr>
              <td>组件卸载</td>
              <td>React 自动处理</td>
              <td>要记得清理定时器</td>
            </tr>
            <tr>
              <td>是否减少请求</td>
              <td>❌ 不减少（它只是渲染层面的调度）</td>
              <td>✅ 减少（常用于控制接口调用频率）</td>
            </tr>
            <tr>
              <td>结论</td>
              <td>解决「渲染卡顿」</td>
              <td>解决「请求太频繁」，两者可以叠加使用</td>
            </tr>
          </tbody>
        </table>
      </Panel>

      <Panel title="使用注意事项">
        <ul className="checklist">
          <li>
            <code>startTransition</code> 里<b>只能放状态更新</b>，不要放副作用（请求、日志、埋点），因为这次更新随时可能被丢弃。
          </li>
          <li>不要用它包裹受控输入框的 onChange，会让输入变卡；反过来，用它包裹「由输入引起的慢列表更新」才对。</li>
          <li>并发特性要求 React 18+ 的 createRoot，且只在「渲染真的慢」的时候才有价值 —— 渲染很快的组件加了它反而多一次渲染。</li>
          <li>配合 Suspense 使用时，注意 transition 期间的 fallback 行为：React 会尽量保留旧内容，而不是闪一下骨架屏。</li>
        </ul>
      </Panel>
    </>
  )
}
