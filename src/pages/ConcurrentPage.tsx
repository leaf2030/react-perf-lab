import { memo, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from 'react'
import { CompareBar } from '../components/CompareBar'
import { DemoCard } from '../components/DemoCard'
import { InputLagProbe, useInputLag } from '../components/InputLagProbe'
import { LagMeter } from '../components/LagMeter'
import { LiveBars } from '../components/LiveBars'
import { PageHeader, Panel } from '../components/PageHeader'
import { RenderBadge } from '../components/RenderBadge'
import { Segmented } from '../components/Segmented'
import { makeItems, simulateWork, type Item } from '../lib/perf'
import { useRenderCount } from '../lib/useRenderCount'

/** 故意做得很慢的一批数据：5000 条里筛出来的结果都要渲染 */
const ALL_ITEMS: Item[] = makeItems(5000)

const MAX_ROWS = 200

/** 每行单独模拟开销，让 React 有机会在行与行之间让出主线程 */
const ROW_RENDER_COST_MS = 2
const AUTO_TYPE_TEXT = 'abcdefgh'
const AUTO_TYPE_INTERVAL_MS = 80

/**
 * 一行数据。
 *
 * 注意：这里**故意**让每一行都做一次昂贵计算（simulateWork），
 * 而且不管输入什么关键字，列表都固定渲染 MAX_ROWS 行。
 * 这样"打字 → 列表重渲染 → 主线程被占满"这条因果链才稳定成立，
 * 不会因为"关键字没匹配到数据"而意外变快。
 */
function SlowRow({ item, keyword }: { item: Item; keyword: string }) {
  simulateWork(ROW_RENDER_COST_MS)

  const hit = keyword.length > 0 && item.label.toLowerCase().includes(keyword.toLowerCase())

  return (
    <div className="nrow" style={{ height: 30, background: hit ? 'var(--warning-bg)' : undefined }}>
      <span>
        <b>#{item.id}</b> {item.label}
      </span>
      <span className="vrow__price">¥{item.price}</span>
    </div>
  )
}

const SlowList = memo(function SlowList({ items, label, keyword }: { items: Item[]; label: string; keyword: string }) {
  const renders = useRenderCount('SlowList')

  return (
    <div className="stack" style={{ gap: 8 }}>
      <RenderBadge
        name={`SlowList（${label}）`}
        count={renders}
        note={`每行模拟 ≈ ${ROW_RENDER_COST_MS} ms`}
      />
      <div style={{ maxHeight: 220, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
        {items.map((item) => (
          <SlowRow key={item.id} item={item} keyword={keyword} />
        ))}
      </div>
      <span className="hint">
        固定渲染 {items.length} 行（不管输入什么，这 {items.length} 行都要重算一遍）
      </span>
    </div>
  )
})

/** 小白友好：把"该点哪里、该看什么"写成编号步骤 */
function Guide({ steps }: { steps: React.ReactNode[] }) {
  return (
    <ol className="guide">
      {steps.map((step, index) => (
        <li key={index}>{step}</li>
      ))}
    </ol>
  )
}

/* =========================================================================
   Demo 1：useDeferredValue
   ========================================================================= */

function DeferredValueDemo() {
  const renders = useRenderCount('DeferredValueDemo')
  const [keyword, setKeyword] = useState('')
  const [mode, setMode] = useState<'plain' | 'deferred'>('plain')
  const [isAutoTyping, setIsAutoTyping] = useState(false)
  const autoTypeTimer = useRef<number | null>(null)
  const inputLag = useInputLag()

  // 记录"列表这次渲染花了多久"，让卡顿有数字可看
  const [plainPeak, setPlainPeak] = useState(0)
  const [deferredPeak, setDeferredPeak] = useState(0)

  const deferredKeyword = useDeferredValue(keyword)
  const effectiveKeyword = mode === 'deferred' ? deferredKeyword : keyword
  const isStale = mode === 'deferred' && keyword !== deferredKeyword

  // 关键：列表永远渲染固定 MAX_ROWS 行，跟关键字匹配到多少条无关。
  // 这样"打任何一个字 → 200 行全部重算 → 主线程被占满"稳定成立。
  const rows = useMemo(() => ALL_ITEMS.slice(0, MAX_ROWS), [])

  // 列表渲染完成后测量耗时：用 rAF 等到这一帧真正画完
  useEffect(() => {
    const started = performance.now()
    const id = requestAnimationFrame(() => {
      const cost = performance.now() - started
      if (mode === 'plain') {
        setPlainPeak((value) => Math.max(value, cost))
      } else {
        setDeferredPeak((value) => Math.max(value, cost))
      }
    })
    return () => cancelAnimationFrame(id)
  }, [effectiveKeyword, mode])

  useEffect(() => {
    return () => {
      if (autoTypeTimer.current !== null) window.clearTimeout(autoTypeTimer.current)
    }
  }, [])

  function startAutoTyping() {
    if (autoTypeTimer.current !== null) window.clearTimeout(autoTypeTimer.current)
    setKeyword('')
    setIsAutoTyping(true)

    let index = 0
    function typeNext() {
      index += 1
      // 自动连打也要打点，否则柱形图是空的
      inputLag.markKeystroke()
      setKeyword(AUTO_TYPE_TEXT.slice(0, index))
      if (index === AUTO_TYPE_TEXT.length) {
        autoTypeTimer.current = null
        setIsAutoTyping(false)
        return
      }
      autoTypeTimer.current = window.setTimeout(typeNext, AUTO_TYPE_INTERVAL_MS)
    }

    autoTypeTimer.current = window.setTimeout(typeNext, 250)
  }

  function handleKeywordChange(value: string) {
    if (autoTypeTimer.current !== null) {
      window.clearTimeout(autoTypeTimer.current)
      autoTypeTimer.current = null
    }
    setIsAutoTyping(false)
    setKeyword(value)
  }

  return (
    <div className="stack">
      <Guide
        steps={[
          <>
            先选左边的 <b>「同步更新（对照组）」</b>，然后在输入框里<b>随便打几个字母</b>（或者点「自动连打对照」）。
          </>,
          <>
            看 <b>图 1</b>：每打一个字就多一根柱子，柱子越高 = 那一次按键卡了多久。
          </>,
          <>
            再选右边的 <b>「延后列表」</b>，重复同样的操作。看 <b>图 2</b>：两种模式的峰值直接并排比。
          </>,
        ]}
      />

      <div className="row">
        <Segmented
          ariaLabel="渲染策略"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'plain', label: '同步更新（对照组）' },
            { value: 'deferred', label: '延后列表（useDeferredValue）' },
          ]}
        />
        <RenderBadge name="DeferredValueDemo" count={renders} />
      </div>

      <div className="row">
        <input
          type="text"
          value={keyword}
          style={{ minWidth: 280 }}
          placeholder="随便打几个字母，比如 abc"
          // 关键：在 onKeyDown 打点，而不是 onChange。
          // React 19 的 onChange 是并发调度，慢渲染发生在它返回之后，
          // 在 onChange 里打点会漏掉真正阻塞主线程的那几百毫秒。
          onKeyDown={() => inputLag.markKeystroke()}
          onChange={(event) => handleKeywordChange(event.target.value)}
        />
        <button type="button" className="btn" onClick={startAutoTyping} disabled={isAutoTyping}>
          {isAutoTyping ? '自动输入中…' : '自动连打对照'}
        </button>
        <span className="hint">
          输入框里的值：<b style={{ color: 'var(--primary)' }}>{keyword || '（空）'}</b>
        </span>
        <span className="hint">
          列表高亮用的值：
          <b style={{ color: isStale ? 'var(--warning)' : 'var(--success)' }}>{effectiveKeyword || '（空）'}</b>
        </span>
        <span
          className={`tag ${isStale ? 'tag--soft' : ''}`}
          style={isStale ? { borderColor: 'var(--warning)', color: 'var(--warning)' } : undefined}
          aria-live="polite"
        >
          {isStale ? '列表显示旧结果，正在追赶' : '列表与输入同步'}
        </span>
      </div>

      {/* 图 1：过程 —— 每一次按键的延迟，实时跳动 */}
      <div className="chart-block">
        <div className="chart-block__head">
          <span className="chart-block__no">图 1</span>
          <span className="chart-block__title">每一次按键的输入延迟</span>
          <span className="chart-block__sub">过程 · 每打一个字就多一根柱子</span>
        </div>
        <InputLagProbe lag={inputLag} />
      </div>

      {/* 图 2：结论 —— 两种模式的峰值并排对比 */}
      <div className="chart-block">
        <div className="chart-block__head">
          <span className="chart-block__no">图 2</span>
          <span className="chart-block__title">两种模式的输入延迟峰值</span>
          <span className="chart-block__sub">结论 · 两种模式各打一遍，柱子越长越卡</span>
        </div>
        <CompareBar
          items={[
            {
              label: '同步更新',
              value: plainPeak,
              tone: 'bad',
              note: plainPeak > 0 ? `最卡的一次 ${plainPeak.toFixed(0)} ms` : '还没测过',
            },
            {
              label: '延后列表',
              value: deferredPeak,
              tone: 'good',
              note: deferredPeak > 0 ? `最卡的一次 ${deferredPeak.toFixed(0)} ms` : '还没测过',
            },
          ]}
          unit="ms"
        />
      </div>

      {isAutoTyping ? <p className="hint">自动逐字输入中：观察输入框是否跟手，以及列表是否落后。</p> : null}
      <div style={{ opacity: isStale ? 0.45 : 1, transition: 'opacity 120ms' }}>
        <SlowList items={rows} label={mode === 'deferred' ? 'deferred' : 'plain'} keyword={effectiveKeyword} />
      </div>

      <div className={`verdict verdict--${mode === 'plain' ? 'bad' : 'good'}`}>
        <span className="verdict__icon">{mode === 'plain' ? '⚠️' : '✅'}</span>
        <span>
          {mode === 'plain'
            ? '同步更新：列表渲染把主线程占满，你的按键要排队等它做完 —— 输入延迟几百毫秒。'
            : '延后列表：输入框的更新先插队完成，列表用旧值慢慢追 —— 输入延迟回到几十毫秒。'}
        </span>
      </div>

      <p className="hint">
        <b>注意：</b>两种模式下列表的渲染耗时是一样的（都是 {MAX_ROWS} 行 × {ROW_RENDER_COST_MS}ms）。
        <code>useDeferredValue</code> 没有让渲染变快，它只是<b>让列表的更新给输入框让路</b>。
        所以它<b>不是防抖</b>，也不会减少计算量。
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

  // 记录"点击到界面恢复响应"的时长 —— 也就是用户被冻住多久
  const [plainFreeze, setPlainFreeze] = useState<number | null>(null)
  const [transitionFreeze, setTransitionFreeze] = useState<number | null>(null)
  // 每次切换的冻结时长都存下来，画成会跳动的柱形图
  const [freezeHistory, setFreezeHistory] = useState<number[]>([])
  const clickAtRef = useRef(0)

  function select(next: TabId) {
    clickAtRef.current = performance.now()

    if (withTransition) {
      startTransition(() => setTab(next))
    } else {
      setTab(next)
    }
  }

  // 等这一帧画完，算出"从点击到画面更新"的真实耗时
  useEffect(() => {
    if (clickAtRef.current === 0) return
    const started = clickAtRef.current
    clickAtRef.current = 0
    // 注意：这里不能返回 cleanup 去 cancelAnimationFrame，
    // 否则 React 在 effect 重跑时会先把这一帧取消掉，永远测不到数据。
    requestAnimationFrame(() => {
      const cost = performance.now() - started
      setFreezeHistory((list) => [...list.slice(-23), cost])
      if (withTransition) {
        setTransitionFreeze(cost)
      } else {
        setPlainFreeze(cost)
      }
    })
  }, [tab, withTransition])

  const activeTab = TABS.find((item) => item.id === tab)

  return (
    <div className="stack">
      <Guide
        steps={[
          <>
            先<b>关掉</b>上面的开关，然后点「数据报表（重）」标签。
          </>,
          <>
            看 <b>图 1</b>：每点一次标签就多一根柱子，柱子越高 = 那一次界面被冻住越久。
          </>,
          <>
            再<b>打开</b>开关，重复点一次。看 <b>图 2</b>：两种模式的冻结时长直接并排比。
          </>,
        ]}
      />

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
          <span className="tag tag--soft" style={{ borderColor: 'var(--warning)', color: 'var(--warning)' }}>
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

      {/* 图 1：过程 —— 每一次切换的冻结时长，实时跳动 */}
      <div className="chart-block">
        <div className="chart-block__head">
          <span className="chart-block__no">图 1</span>
          <span className="chart-block__title">每一次切换的界面冻结时长</span>
          <span className="chart-block__sub">过程 · 每点一次标签就多一根柱子</span>
        </div>
        <LiveBars
          values={freezeHistory}
          max={400}
          warnAt={60}
          badAt={200}
          unit="ms"
          emptyText="点几次标签，这里会出现每次切换的冻结时长"
        />
      </div>

      {/* 图 2：结论 —— 两种模式的冻结时长并排对比 */}
      <div className="chart-block">
        <div className="chart-block__head">
          <span className="chart-block__no">图 2</span>
          <span className="chart-block__title">两种模式的界面冻结时长</span>
          <span className="chart-block__sub">结论 · 两种模式各点一遍，柱子越长越卡</span>
        </div>
        <div className="grid-2">
          <div className={`freeze ${plainFreeze === null ? '' : plainFreeze > 80 ? 'freeze--bad' : 'freeze--good'}`}>
            <span className="freeze__num">{plainFreeze === null ? '—' : plainFreeze.toFixed(0)}</span>
            <span className="freeze__text">
              <b>ms · 不用 transition</b>
              <br />
              点完标签，界面被冻住多久
            </span>
          </div>
          <div
            className={`freeze ${transitionFreeze === null ? '' : transitionFreeze > 80 ? 'freeze--bad' : 'freeze--good'}`}
          >
            <span className="freeze__num">{transitionFreeze === null ? '—' : transitionFreeze.toFixed(0)}</span>
            <span className="freeze__text">
              <b>ms · 用 transition</b>
              <br />
              点完标签，界面被冻住多久
            </span>
          </div>
        </div>
        <CompareBar
          items={[
            { label: '不用 transition', value: plainFreeze ?? 0, tone: 'bad', note: '同步渲染，主线程被占满' },
            { label: '用 transition', value: transitionFreeze ?? 0, tone: 'good', note: '标签先变色，报表后台渲染' },
          ]}
          unit="ms"
        />
      </div>

      {/* 实时盯着主线程有没有被占住 */}
      <LagMeter running={isPending} label="主线程卡顿（切换期间实时采样）" />

      <div className="panel" style={{ marginBottom: 0, minHeight: 140 }}>
        <h4 className="panel__title">当前标签：{activeTab?.label}</h4>
        {tab === 'report' ? <HeavyReport /> : <p className="hint">这个标签的内容很轻，切换是瞬时的。</p>}
      </div>

      <div className={`verdict verdict--${withTransition ? 'good' : 'bad'}`}>
        <span className="verdict__icon">{withTransition ? '✅' : '⚠️'}</span>
        <span>
          {withTransition
            ? 'startTransition：标签选中态立刻更新（高优先级），报表在后台慢慢渲染（低优先级），期间页面还能点、还能滚。'
            : '同步更新：标签和报表一起渲染，主线程被占满，点完什么都不动 —— 这就是"卡住"。'}
        </span>
      </div>

      <p className="hint">
        两种方式渲染报表的耗时是一样的（约 120ms）。区别只在于：<b>transition 允许这次渲染被打断</b>，
        所以 React 可以先把"标签变色"这件小事做完，再去慢慢渲染报表。
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
  // 每次重排的实测耗时，画成会跳动的柱形图
  const [costHistory, setCostHistory] = useState<number[]>([])

  return (
    <div className="stack">
      <Guide
        steps={[
          <>
            先<b>关掉</b>开关（改用 <code>useEffect</code>），点「重排一次」。
          </>,
          <>
            看 <b>图 2</b>：中间那一帧是<b>红色</b>的 —— 方块先出现在错误位置，下一帧才跳到正确位置，这就是<b>闪烁</b>。
          </>,
          <>
            再<b>打开</b>开关（改用 <code>useLayoutEffect</code>），重复点一次。中间帧变成<b>绿色</b>，用户看不到错误位置。
          </>,
        ]}
      />

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
        <TimedEffectProbe key={`layout-${tick}`} tick={tick} useLayoutEffect onCost={(ms) => setCostHistory((list) => [...list.slice(-23), ms])} />
        <TimedEffectProbe key={`effect-${tick}`} tick={tick} useLayoutEffect={false} />
      </div>

      {/* 图 1：过程 —— 每一次重排的实测耗时，实时跳动 */}
      <div className="chart-block">
        <div className="chart-block__head">
          <span className="chart-block__no">图 1</span>
          <span className="chart-block__title">每一次「重排一次」的实测耗时</span>
          <span className="chart-block__sub">过程 · 每点一次就多一根柱子</span>
        </div>
        <LiveBars
          values={costHistory}
          max={200}
          warnAt={40}
          badAt={120}
          unit="ms"
          emptyText="点几次「重排一次」，这里会出现每次的实测耗时"
        />
      </div>

      {/* 图 2：结论 —— 两种时机的可见中间态帧数 + 三帧可视化 */}
      <div className="chart-block">
        <div className="chart-block__head">
          <span className="chart-block__no">图 2</span>
          <span className="chart-block__title">用户实际看到的帧</span>
          <span className="chart-block__sub">结论 · 切换开关，看中间态会不会被看见</span>
        </div>
        <CompareBar
          items={[
            { label: 'useEffect', value: 1, tone: 'bad', note: '多出 1 帧可见的错误位置' },
            { label: 'useLayoutEffect', value: 0, tone: 'good', note: '错误位置在绘制前就被修正' },
          ]}
          unit="帧"
          max={1}
        />
        <div className="flicker">
          <div className="flicker__title">
            <span>每次点「重排一次」都会重演这三帧</span>
            <span className={`flicker__verdict flicker__verdict--${useLayout ? 'good' : 'bad'}`}>
              {useLayout ? '✅ 没有可见的中间态' : '❌ 有 1 帧可见的中间态'}
            </span>
          </div>
          <div className="flicker__frames">
            <div className="flicker__frame">
              <div className="flicker__dot" />
              <span>第 1 帧 · 起点</span>
            </div>
            <div className={`flicker__frame ${useLayout ? '' : 'is-flash'}`}>
              <div className="flicker__dot" />
              <span>{useLayout ? '第 2 帧 · 已修正（看不到）' : '第 2 帧 · 错误位置 ⚠️'}</span>
            </div>
            <div className="flicker__frame is-final">
              <div className="flicker__dot" />
              <span>第 3 帧 · 终点</span>
            </div>
          </div>
        </div>
      </div>

      <div className={`verdict verdict--${useLayout ? 'good' : 'bad'}`}>
        <span className="verdict__icon">{useLayout ? '✅' : '⚠️'}</span>
        <span>
          {useLayout
            ? 'useLayoutEffect 在浏览器绘制之前同步执行，位置修正和 DOM 更新在同一帧完成，用户看不到中间态。'
            : 'useEffect 在浏览器绘制之后才执行，用户会先看到"错误位置"的那一帧，然后才跳到正确位置 —— 视觉上就是闪一下。'}
        </span>
      </div>

      <p className="hint">
        代价：<code>useLayoutEffect</code> 会<b>阻塞绘制</b>。上面每次重排都模拟了 {LAYOUT_COST_MS}ms 的测量工作，
        如果这段工作很重，页面反而会卡。所以规则是：<b>凡是「读取布局 → 立刻改样式」才用它</b>（测量 DOM、滚动定位、tooltip 定位、动画起点），
        其余所有场景（请求、订阅、日志）一律用 <code>useEffect</code>。
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
function TimedEffectProbe({
  tick,
  useLayoutEffect: useLayout,
  onCost,
}: {
  tick: number
  useLayoutEffect: boolean
  /** 把这次重排的实测耗时上报给父组件（用于画柱形图） */
  onCost?: (ms: number) => void
}) {
  const blockRef = useRef<HTMLDivElement>(null)

  // 两种时机共用同一段逻辑，方便对照
  function reposition() {
    const started = performance.now()
    // 模拟"读取布局 → 计算 → 写样式"这套不可避免的同步操作
    simulateWork(LAYOUT_COST_MS)
    if (blockRef.current) {
      // 用一个随 tick 变化的偏移，让位置每次都不一样
      const pct = 8 + ((tick * 37) % 84)
      blockRef.current.style.marginLeft = `${pct}%`
      blockRef.current.dataset.done = '1'
    }
    onCost?.(performance.now() - started)
  }

  const EffectHook = useLayout ? useLayoutEffect : useEffect

  EffectHook(() => {
    reposition()
  }, [tick])

  return (
    <div className="stack" style={{ gap: 6 }}>
      <p className="hint" style={{ margin: 0 }}>
        <b style={{ color: useLayout ? 'var(--success)' : 'var(--error)' }}>
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
   页面
   ========================================================================= */

export default function ConcurrentPage() {
  return (
    <>
      <PageHeader
        index="07"
        title="并发渲染特性"
        subtitle="useTransition 和 useDeferredValue 是 React 18 给的两个「体感优化」利器：它们不会让渲染变快，但能让重要的交互不被慢渲染挡住。本章还会讲清两个决定「会不会闪」的时机类 API。"
        tags={['useTransition', 'useDeferredValue', 'useLayoutEffect', '并发渲染']}
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
