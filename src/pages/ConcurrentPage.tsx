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

type EffectKind = 'effect' | 'layout'

/** 立方体转一圈的时长（ms）—— 越短，每帧角度变化越大，"慢一帧"越明显 */
const ANIM_PERIOD_MS = 400

/** 立方体的 6 个面 */
const CUBE_FACES = ['front', 'back', 'right', 'left', 'top', 'bottom'] as const

/** 拖影保留的帧数（useEffect 立方体的"幽灵"） */
const GHOST_FRAMES = 4

/**
 * 两个 3D 立方体**重叠**在同一个舞台里，跑**同一个旋转动画**（绕 X / Y 轴翻滚）。
 *
 * 唯一的区别：动画每一帧算出的旋转角度，用哪种 effect 同步到 DOM。
 *
 * - useLayoutEffect（绿色，底层）：绘制前同步 → 用**当前帧**角度 → 严丝合缝
 * - useEffect（红色，上层）：绘制后才同步 → 只能拿到**上一帧**角度 → 恒定慢一帧
 *
 * 关键：useEffect 在浏览器**绘制之后**才执行，所以它写进 DOM 的，
 * 永远是"上一帧算出的角度"—— 这不是造假，而是 useEffect 的真实语义。
 *
 * 两个立方体**叠在一起**，错位会直接表现为"红绿重影/撕裂"，
 * 再加上红色立方体的**拖影**（保留前几帧的幽灵），一眼就能看出谁在拖后腿。
 *
 * 实现要点：动画直接改 DOM（ref.style），不经过 React state ——
 * 这正是 useLayoutEffect 的经典用法，也避免了每帧 setState 的死循环。
 */
function LayoutEffectDemo() {
  const [running, setRunning] = useState(true)
  // 两种时机各自累积的"落后帧数"（客观测量，作为补充证据）
  const [lag, setLag] = useState<Record<EffectKind, number>>({ effect: 0, layout: 0 })

  // 两个立方体的 DOM 引用
  const effectCubeRef = useRef<HTMLDivElement>(null)
  const layoutCubeRef = useRef<HTMLDivElement>(null)
  // 拖影（幽灵）的 DOM 引用
  const ghostRefs = useRef<(HTMLDivElement | null)[]>([])

  // 动画当前帧的进度（rAF 写入，effect 读取）
  const frameProgressRef = useRef(0)
  // 上一帧的进度（useEffect 读它 —— 因为它在绘制后才执行）
  const prevProgressRef = useRef(0)
  // 拖影用的历史进度（最近 GHOST_FRAMES 帧）
  const ghostHistoryRef = useRef<number[]>([])
  // 动画帧号
  const frameRef = useRef(0)
  // 上一次 effect 同步时的帧号
  const syncedFrameRef = useRef<Record<EffectKind, number>>({ effect: -1, layout: -1 })
  // 落后帧数（用 ref 累积，避免每帧 setState）
  const lagRef = useRef<Record<EffectKind, number>>({ effect: 0, layout: 0 })

  /** 把进度写进立方体的 3D 旋转（直接改 DOM） */
  function paintCube(el: HTMLDivElement | null, p: number) {
    if (!el) return
    const angle = p * 360
    el.style.transform = `rotateX(${angle}deg) rotateY(${angle * 1.6}deg)`
  }

  // 动画驱动：每帧更新进度
  useEffect(() => {
    if (!running) return
    let raf = 0
    const start = performance.now()
    const loop = (now: number) => {
      const t = ((now - start) % ANIM_PERIOD_MS) / ANIM_PERIOD_MS
      // 0 → 1 → 0 的三角波，来回翻滚
      prevProgressRef.current = frameProgressRef.current
      frameProgressRef.current = t < 0.5 ? t * 2 : (1 - t) * 2
      // 记录历史进度，供拖影使用
      ghostHistoryRef.current.push(frameProgressRef.current)
      if (ghostHistoryRef.current.length > GHOST_FRAMES) ghostHistoryRef.current.shift()
      frameRef.current += 1
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [running])

  /**
   * 两种时机的唯一区别：把"动画当前帧的角度"写进 DOM 的时机。
   *
   * 注意：用两个独立的 effect（而不是条件切换 Hook 类型），
   * 否则会违反 React 的 Hooks 规则。
   *
   * 这里直接改 DOM（不 setState），所以不会触发重渲染、不会死循环。
   */
  useLayoutEffect(() => {
    if (!running) return
    const f = frameRef.current
    // 落后了几帧？（正常情况下 useLayoutEffect 是 0）
    const behind = Math.max(0, f - syncedFrameRef.current.layout - 1)
    syncedFrameRef.current.layout = f
    lagRef.current.layout += behind
    // 绘制前同步：用**当前帧**的角度 → 严丝合缝
    paintCube(layoutCubeRef.current, frameProgressRef.current)
  })

  useEffect(() => {
    if (!running) return
    const f = frameRef.current
    const behind = Math.max(0, f - syncedFrameRef.current.effect - 1)
    syncedFrameRef.current.effect = f
    lagRef.current.effect += behind
    // 绘制后同步：只能拿到**上一帧**的角度 → 恒定慢一帧
    paintCube(effectCubeRef.current, prevProgressRef.current)
    // 拖影：把最近几帧的角度画成幽灵
    const history = ghostHistoryRef.current
    ghostRefs.current.forEach((ghost, i) => {
      const p = history[history.length - 1 - i]
      if (ghost && p !== undefined) paintCube(ghost, p)
    })
  })

  // 每 500ms 把 ref 里的落后帧数同步到界面（避免每帧 setState）
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setLag({ ...lagRef.current })
    }, 500)
    return () => clearInterval(id)
  }, [running])

  return (
    <div className="stack">
      <Guide
        steps={[
          <>
            下面两个 <b>3D 立方体叠在一起</b>，跑的是<b>同一个旋转动画</b>（绕 X / Y 轴翻滚）。
          </>,
          <>
            <b style={{ color: 'var(--success)' }}>绿色</b>用 <b>useLayoutEffect</b> 同步角度：绘制<b>之前</b>就改好了，
            用的是<b>当前帧</b>的角度 → <b>丝滑</b>。
          </>,
          <>
            <b style={{ color: 'var(--error)' }}>红色</b>用 <b>useEffect</b> 同步角度：绘制<b>之后</b>才执行，
            只能拿到<b>上一帧</b>的角度 → 恒定慢一帧 → <b>红绿重影、拖尾</b>。
          </>,
          <>
            点 <b>「暂停 / 继续」</b>可以定格对比；<b>「重置」</b>清零落后帧数。
          </>,
        ]}
      />

      <div className="row">
        <button type="button" className="btn btn--primary" onClick={() => setRunning((v) => !v)}>
          {running ? '暂停' : '继续'}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            lagRef.current = { effect: 0, layout: 0 }
            syncedFrameRef.current = { effect: -1, layout: -1 }
            setLag({ effect: 0, layout: 0 })
          }}
        >
          重置
        </button>
        <span className="hint">旋转周期 {ANIM_PERIOD_MS} ms</span>
      </div>

      {/* 两个立方体**重叠**在同一舞台：错位 = 红绿重影，一眼可见 */}
      <div className="stack" style={{ gap: 6 }}>
        <span className="hint" style={{ fontSize: 12, textAlign: 'center' }}>
          <b style={{ color: 'var(--success)' }}>绿 = useLayoutEffect</b>（绘制前同步，不落后）
          &nbsp;·&nbsp;
          <b style={{ color: 'var(--error)' }}>红 = useEffect</b>（绘制后同步，落后 {lag.effect} 帧）
        </span>
        <div className="effect-stage effect-stage--overlay">
          {/* 底层：useLayoutEffect 立方体（绿） */}
          <div ref={layoutCubeRef} className="effect-cube effect-cube--good">
            {CUBE_FACES.map((face) => (
              <div key={face} className={`effect-cube__face effect-cube__face--${face}`} />
            ))}
          </div>
          {/* 拖影：useEffect 立方体最近几帧的幽灵 */}
          {Array.from({ length: GHOST_FRAMES }).map((_, i) => (
            <div
              key={i}
              ref={(el) => {
                ghostRefs.current[i] = el
              }}
              className="effect-ghost"
            >
              {CUBE_FACES.map((face) => (
                <div key={face} className={`effect-cube__face effect-cube__face--${face}`} />
              ))}
            </div>
          ))}
          {/* 上层：useEffect 立方体（红） */}
          <div ref={effectCubeRef} className="effect-cube effect-cube--bad">
            {CUBE_FACES.map((face) => (
              <div key={face} className={`effect-cube__face effect-cube__face--${face}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="verdict verdict--bad">
        <span className="verdict__icon">⚠️</span>
        <span>
          <b>useEffect</b> 在浏览器绘制之后才执行：动画每一帧算出的新角度，要等到<b>下一帧</b>才生效 ——
          立方体永远落后一帧，连续旋转里就表现为<b>抖动、撕裂</b>。
        </span>
      </div>

      <div className="verdict verdict--good">
        <span className="verdict__icon">✅</span>
        <span>
          <b>useLayoutEffect</b> 在浏览器绘制之前同步执行：位置修正和 DOM 更新在<b>同一帧</b>完成 ——
          方块和动画帧严丝合缝，<b>丝滑</b>。
        </span>
      </div>

      {/* 补充证据：落后帧数（客观测量） */}
      <div className="chart-block">
        <div className="chart-block__head">
          <span className="chart-block__no">图 1</span>
          <span className="chart-block__title">累计「落后帧数」</span>
          <span className="chart-block__sub">补充证据 · 动画跑得越久，差距越大</span>
        </div>
        <CompareBar
          items={[
            { label: 'useEffect', value: lag.effect, tone: 'bad', note: '绘制后同步 → 每帧都慢一拍' },
            { label: 'useLayoutEffect', value: lag.layout, tone: 'good', note: '绘制前同步 → 不落后' },
          ]}
          unit="帧"
          max={Math.max(10, lag.effect, lag.layout)}
        />
      </div>

      {/* 重点：什么时候该用 useLayoutEffect */}
      <div className="panel" style={{ marginBottom: 0 }}>
        <h4 className="panel__title">什么时候该用 useLayoutEffect？</h4>
        <table className="table">
          <thead>
            <tr>
              <th>场景</th>
              <th>用哪个</th>
              <th>为什么</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <b>读取布局 → 立刻改样式</b>
                <br />
                <span className="hint">测量 DOM 尺寸、滚动定位、tooltip 定位、动画起点</span>
              </td>
              <td>
                <b style={{ color: 'var(--success)' }}>useLayoutEffect</b>
              </td>
              <td>必须在绘制前修正，否则用户会看到"先错后对"的闪烁</td>
            </tr>
            <tr>
              <td>
                <b>请求数据、订阅、打日志、埋点</b>
              </td>
              <td>
                <b style={{ color: 'var(--primary)' }}>useEffect</b>
              </td>
              <td>这些不关心绘制时机，用 useEffect 不会阻塞绘制</td>
            </tr>
            <tr>
              <td>
                <b>服务端渲染（SSR）</b>
              </td>
              <td>
                <b style={{ color: 'var(--warning)' }}>避免 useLayoutEffect</b>
              </td>
              <td>服务端没有 DOM，会报警告；需要时改用 useEffect 或 <code>useIsomorphicLayoutEffect</code></td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="hint">
        <b>代价：</b><code>useLayoutEffect</code> 会<b>阻塞绘制</b>。上面每一帧都在同步位置，
        如果这段工作很重，页面反而会卡。所以规则是：<b>只有「读取布局 → 立刻改样式」才用它</b>，
        其余所有场景一律用 <code>useEffect</code>。
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
        desc="两个 3D 立方体跑同一个旋转动画，唯一区别是用哪种 effect 同步角度。左边 useEffect 永远慢一帧 → 抖动、撕裂；右边 useLayoutEffect 严丝合缝 → 丝滑。"
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
