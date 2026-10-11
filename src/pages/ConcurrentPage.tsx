import { memo, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from 'react'
import { flushSync } from 'react-dom'
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
   Demo 3：useEffect vs useLayoutEffect —— 时机决定了会不会闪
   ========================================================================= */

/** 让"闪一下"变得肉眼可见：故意让 effect 里的计算慢一点 */
const LAYOUT_COST_MS = 30

function LayoutEffectDemo() {
  const [tick, setTick] = useState(0)
  const [useLayout, setUseLayout] = useState(true)

  return (
    <div className="stack">
      <div className="row">
        <label className="switch">
          <input type="checkbox" checked={useLayout} onChange={(event) => setUseLayout(event.target.checked)} />
          <span>使用 useLayoutEffect（关掉则用 useEffect）</span>
        </label>
        <button type="button" className="btn" onClick={() => setTick((value) => value + 1)}>
          重排一次（同一个方块，两种时机）
        </button>
        <span className="hint">第 {tick} 次</span>
      </div>

      {/* key 里带上 tick：每次点击都换一个新组件，保证 effect 一定重新执行 */}
      <div className="grid-2">
        <TimedEffectProbe key={`layout-${tick}`} tick={tick} useLayoutEffect />
        <TimedEffectProbe key={`effect-${tick}`} tick={tick} useLayoutEffect={false} />
      </div>

      <p className="hint">
        反复点「重排一次」，盯着左边那块：<b>左边的方块会直接出现在最终位置，右边的方块会先出现在起点、再跳到终点</b>（闪一下）。
        原因很直接 —— <code>useEffect</code> 是在浏览器<b>已经绘制之后</b>才执行的，所以中间那一帧被用户看见了；
        <code>useLayoutEffect</code> 在<b>绘制之前、DOM 更新之后</b>同步执行，用户永远看不到中间态。
      </p>
      <p className="hint">
        所以：<b>凡是「读取布局 → 立刻改样式」的操作，必须用 useLayoutEffect</b>（测量 DOM、滚动定位、tooltip 定位、动画起点）。
        但它是<b>同步阻塞绘制</b>的，做重活会把页面卡死 —— 这个 Demo 里的 {' '}
        <code>{LAYOUT_COST_MS}ms</code> 你在左边是能感受到的。
        其余所有场景（请求、订阅、日志）一律用 useEffect。
      </p>
    </div>
  )
}

/**
 * 同一个方块，两种 effect 时机。
 *
 * - useLayoutEffect：绘制前同步执行 → 用户看不到中间态，但会阻塞绘制
 * - useEffect：绘制后异步执行 → 用户能看到"先这样、再那样"的闪烁
 */
function TimedEffectProbe({ tick, useLayoutEffect: useLayout }: { tick: number; useLayoutEffect: boolean }) {
  const blockRef = useRef<HTMLDivElement>(null)

  // 两种时机共用同一段逻辑，方便对照
  function reposition() {
    // 模拟"读取布局 → 计算 → 写样式"这套不可避免的同步操作
    simulateWork(LAYOUT_COST_MS)
    if (blockRef.current) {
      // 用一个随 tick 变化的偏移，让位置每次都不一样
      const pct = 8 + ((tick * 37) % 84)
      blockRef.current.style.marginLeft = `${pct}%`
      blockRef.current.dataset.done = '1'
    }
  }

  const EffectHook = useLayout ? useLayoutEffect : useEffect

  EffectHook(() => {
    reposition()
  }, [tick])

  return (
    <div className="stack" style={{ gap: 6 }}>
      <p className="hint" style={{ margin: 0 }}>
        <b style={{ color: useLayout ? 'var(--good)' : 'var(--bad)' }}>
          {useLayout ? 'useLayoutEffect' : 'useEffect'}
        </b>
        <span style={{ marginLeft: 8, fontSize: 11 }}>
          {useLayout ? '绘制前执行 → 无闪烁' : '绘制后执行 → 会闪一下'}
        </span>
      </p>
      <div className="effect-track">
        <div className="effect-block" ref={blockRef} />
      </div>
      <span className="hint" style={{ fontSize: 11 }}>
        {useLayout ? '这一帧用户只看到最终位置' : '先渲染在起点 → 绘制 → 再跳到终点'}
      </span>
    </div>
  )
}

/* =========================================================================
   Demo 4：flushSync —— 主动放弃并发特性的"反面教材"
   ========================================================================= */

function FlushSyncDemo() {
  const renders = useRenderCount('FlushSyncDemo')
  const [items, setItems] = useState<string[]>([])
  const [mode, setMode] = useState<'normal' | 'flush'>('normal')
  const logRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  function add(inFlush: boolean) {
    const task = () => {
      setItems((list) => [...list, `任务 #${list.length + 1}`])
      setMode(inFlush ? 'flush' : 'normal')
    }

    if (inFlush) {
      // ⚠️ flushSync 会强制这次更新立刻同步渲染、立刻提交
      flushSync(task)
    } else {
      task()
    }

    // 这一行是 Demo 的关键：普通模式下它会在"渲染之前"执行，
    // 而 flushSync 之后 DOM 已经被更新完了。
    // 注意要读的是列表容器（listRef），不是日志这一行自己。
    if (logRef.current && listRef.current) {
      const count = listRef.current.querySelectorAll('.tag').length
      logRef.current.textContent =
        `点击后立刻读 DOM：列表里有 ${count} 个任务` +
        (inFlush ? '（flushSync：DOM 已同步更新 ✅）' : '（普通更新：读到的是旧 DOM ⚠️）')
    }
  }

  return (
    <div className="stack">
      <div className="row">
        <button type="button" className="btn" onClick={() => add(false)}>
          普通 setState
        </button>
        <button type="button" className="btn btn--danger" onClick={() => add(true)}>
          用 flushSync 包住
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => setItems([])}>
          清空
        </button>
        <RenderBadge name="FlushSyncDemo" count={renders} />
        {mode === 'flush' ? <span className="tag tag--soft">上一次用了 flushSync</span> : null}
      </div>

      <div className="row" ref={logRef} style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--warn)' }}>
        点一个按钮试试
      </div>

      <div className="row" ref={listRef} style={{ flexWrap: 'wrap', gap: 6 }}>
        {items.map((item) => (
          <span className="tag tag--soft" key={item}>
            {item}
          </span>
        ))}
      </div>

      <p className="hint">
        左边的按钮是普通更新，右边包了 <code>flushSync</code>。点完看一眼上面那行日志：
        <b>普通模式下 DOM 还没更新</b>（读到的还是旧数量），<b>flushSync 后 DOM 已经变了</b>。
      </p>
      <p className="hint">
        这正是 flushSync 的用途：<b>少数必须"写完立刻读 DOM"的场景</b>，比如先测量再弹层、把某个节点滚到可视区、
        配合第三方非 React 图表库同步尺寸。
      </p>
      <p className="hint" style={{ color: 'var(--bad)' }}>
        ⚠️ 但它的代价是：<b>强制同步渲染，等于主动关掉并发特性</b> —— 这次更新不能被中断、不能被打断优先级，
        而且会打断批处理（可能多渲染几次）。在渲染很贵的页面上用它会直接掉帧。
        结论：<b>默认永远不要用，只在"测量 DOM 后立刻操作 DOM"这一种场景下用，并且包在最小范围里。</b>
        如果需要刷新 DOM 同步更新，优先考虑改用 <code>useLayoutEffect</code>。
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
        subtitle="useTransition 和 useDeferredValue 是 React 18 给的两个「体感优化」利器：它们不会让渲染变快，但能让重要的交互不被慢渲染挡住。本章还会讲清两个决定「会不会闪」的时机类 API。"
        tags={['useTransition', 'useDeferredValue', 'useLayoutEffect', 'flushSync', '并发渲染']}
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

      <DemoCard
        title="Demo 3｜useEffect vs useLayoutEffect：时机决定了会不会闪"
        tag="API（必讲）"
        tone="bad"
        desc="两个 effect 长得几乎一样，区别只在「什么时候执行」。而这一点差异，直接决定了用户会不会看到闪烁。"
        codeTone="good"
        code={`// ❌ useEffect：绘制之后才改样式 → 用户先看到旧位置，再看到跳动
useEffect(() => {
  const height = ref.current.getBoundingClientRect().height
  ref.current.style.transform = \`translateY(\${height}px)\`
}, [deps])

// ✅ useLayoutEffect：绘制前同步执行 → 用户只看到最终结果
useLayoutEffect(() => {
  const height = ref.current.getBoundingClientRect().height
  ref.current.style.transform = \`translateY(\${height}px)\`
}, [deps])

// ✅ 常规用途一律用 useEffect（不阻塞绘制）
useEffect(() => {
  const sub = store.subscribe(handler)
  return () => sub.unsubscribe()   // 清理订阅
}, [store])`}
      >
        <LayoutEffectDemo />
      </DemoCard>

      <DemoCard
        title="Demo 4｜flushSync：主动放弃并发特性的反面教材"
        tone="bad"
        desc="它能让你「更新完立刻读到新 DOM」，代价是这次更新彻底失去并发能力。"
        codeTone="good"
        code={`// ❌ 用 flushSync 只是为了"更新后立刻读 DOM"
function handleClick() {
  flushSync(() => setOpen(true))
  // 现在 DOM 已经更新了，可以测量了
  const rect = popoverRef.current.getBoundingClientRect()
  // ⚠️ 但这次更新失去了并发能力，还可能多渲染
}

// ✅ 更好的写法：用 useLayoutEffect，绘制前自动拿到最新布局
function Popover({ open }) {
  useLayoutEffect(() => {
    if (!open) return
    const rect = popoverRef.current.getBoundingClientRect()
    // 在这里定位，不破坏并发调度
  }, [open])
}

// ⚠️ flushSync 也会打断批处理
flushSync(() => setA(1))
flushSync(() => setB(2))   // 两次渲染，而不是一次`}
      >
        <FlushSyncDemo />
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
          <li>
            <code>flushSync</code> 与本章其它 API 正好相反：它是「退出并发模式」的开关，属于逃生舱，不属于优化手段。
          </li>
        </ul>
      </Panel>
    </>
  )
}
