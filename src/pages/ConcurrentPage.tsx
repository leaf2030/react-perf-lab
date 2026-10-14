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

/** 立方体跑完全程的时长（ms）—— 越长跑得越慢，越看得清 */
const ANIM_PERIOD_MS = 2400

/** 立方体的 6 个面 */
const CUBE_FACES = ['front', 'back', 'right', 'left', 'top', 'bottom'] as const

/** useEffect 立方体固定滞后的帧数（越大越明显） */
const LAG_FRAMES = 3

/**
 * 位置是**帧号的纯函数** —— 这样绝不会抖：
 * 同一个帧号永远算出同一个位置，与渲染时机无关。
 *
 * 单向运动（0 → 1 循环），所以"落后"永远表现为"落在后面"，
 * 观众一眼就能看出谁在前、谁在后。
 */
function progressAt(frame: number): number {
  const period = ANIM_PERIOD_MS / 16.7
  // 真正的取模：负数也能正确回绕（否则 frame - lag 为负时会跑到轨道末尾）
  const f = ((frame % period) + period) % period
  return f / period
}

/**
 * 两个 3D 立方体在**同一条轨道上赛跑**，跑**同一个单向动画**（从左到右 + 翻滚）。
 *
 * 唯一的区别：动画每一帧算出的位置，用哪种 effect 同步到 DOM。
 *
 * - useLayoutEffect（绿色）：绘制前同步 → 用**当前帧**位置 → 永远跑在前面
 * - useEffect（红色）：绘制后才同步 → 只能拿到**上一帧**位置 → 永远落在后面
 *
 * 关键：useEffect 在浏览器**绘制之后**才执行，所以它写进 DOM 的，
 * 永远是"上一帧算出的位置"—— 这不是造假，而是 useEffect 的真实语义。
 *
 * 单向运动下，"落后"表现为**恒定地落在绿色后面**，再加上红色立方体的
 * **拖影**（保留前几帧的幽灵），一眼就能看出谁在拖后腿。
 *
 * 实现要点：位置是帧号的纯函数，effect 里直接改 DOM（ref.style），
 * 不经过额外 state —— 这正是 useLayoutEffect 的经典用法。
 */
function LayoutEffectDemo() {
  // 默认暂停：观众点「开始」才跑，避免一进页面就动起来
  const [running, setRunning] = useState(false)
  // 动画帧号 —— 每帧 setState，驱动 React 重渲染，
  // 这样 useLayoutEffect / useEffect 才会**每帧**执行（真实体现时机差异）
  const [frame, setFrame] = useState(0)

  // 两个立方体的 DOM 引用
  const effectCubeRef = useRef<HTMLDivElement>(null)
  const layoutCubeRef = useRef<HTMLDivElement>(null)
  // 拖影（幽灵）的 DOM 引用 —— 固定 4 个，避免 ref 回调数组反复重建
  const ghost1Ref = useRef<HTMLDivElement>(null)
  const ghost2Ref = useRef<HTMLDivElement>(null)
  const ghost3Ref = useRef<HTMLDivElement>(null)
  const ghost4Ref = useRef<HTMLDivElement>(null)

  /** 把进度写进立方体的位置 + 翻滚（直接改 DOM） */
  function paintCube(el: HTMLDivElement | null, p: number) {
    if (!el) return
    // 水平位置：0% → 82%（留出立方体宽度）
    el.style.left = `${p * 82}%`
    // 顺带翻滚，让运动更醒目
    const angle = p * 720
    el.style.transform = `rotateX(${angle}deg) rotateY(${angle * 1.6}deg)`
  }

  // 动画驱动：每帧推进帧号 + 触发一次重渲染
  useEffect(() => {
    if (!running) return
    let raf = 0
    const loop = () => {
      // 每帧 setState → 触发重渲染 → 两个 effect 每帧执行
      setFrame((n) => n + 1)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [running])

  /**
   * 两种时机的唯一区别：把"动画当前帧的位置"写进 DOM 的时机。
   *
   * 注意：用两个独立的 effect（而不是条件切换 Hook 类型），
   * 否则会违反 React 的 Hooks 规则。
   *
   * 这里直接改 DOM（不 setState），所以不会触发额外重渲染。
   */
  useLayoutEffect(() => {
    if (!running) return
    // 绘制前同步：用**当前帧**的位置 → 永远跑在前面
    paintCube(layoutCubeRef.current, progressAt(frame))
  })

  useEffect(() => {
    if (!running) return
    // 绘制后同步：只能拿到**上一帧**的位置 → 永远落在后面
    // 开头 60 帧内，滞后量从 0 逐渐涨到 LAG_FRAMES ——
    // 让观众看到"从完全重合 → 逐渐拉开"，而不是一上来就错位（像 bug）
    const ramp = Math.min(1, frame / 60)
    const lagFrames = Math.round(LAG_FRAMES * ramp)
    paintCube(effectCubeRef.current, progressAt(frame - lagFrames))
    // 拖影：把最近几帧的位置画成幽灵
    paintCube(ghost1Ref.current, progressAt(frame - 1))
    paintCube(ghost2Ref.current, progressAt(frame - 2))
    paintCube(ghost3Ref.current, progressAt(frame - 3))
    paintCube(ghost4Ref.current, progressAt(frame - 4))
  })

  // 暂停时（含初始状态）把两个立方体都画到起点，保证视觉上完全重合
  useEffect(() => {
    if (running) return
    const p = progressAt(frame)
    paintCube(layoutCubeRef.current, p)
    paintCube(effectCubeRef.current, p)
    paintCube(ghost1Ref.current, p)
    paintCube(ghost2Ref.current, p)
    paintCube(ghost3Ref.current, p)
    paintCube(ghost4Ref.current, p)
  }, [running, frame])

  return (
    <div className="stack">
      <Guide
        steps={[
          <>
            下面两个 <b>3D 立方体在同一条轨道上赛跑</b>，跑的是<b>同一个单向动画</b>（从左到右 + 翻滚）。
          </>,
          <>
            <b style={{ color: 'var(--success)' }}>绿色</b>用 <b>useLayoutEffect</b> 同步位置：绘制<b>之前</b>就改好了，
            用的是<b>当前帧</b>的位置 → <b>永远跑在前面</b>。
          </>,
          <>
            <b style={{ color: 'var(--error)' }}>红色</b>用 <b>useEffect</b> 同步位置：绘制<b>之后</b>才执行，
            只能拿到<b>上一帧</b>的位置 → <b>永远落在后面</b>，还拖着一串残影。
          </>,
          <>
            点 <b>「开始」</b>让两个立方体从<b>同一起点</b>出发；<b>「暂停」</b>可以定格对比；<b>「重置」</b>回到起点。
          </>,
        ]}
      />

      <div className="row">
        <button type="button" className="btn btn--primary" onClick={() => setRunning((v) => !v)}>
          {running ? '暂停' : '开始'}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            // 帧号归零 → 两个立方体都回到起点，重新从"完全重合"开始
            setFrame(0)
          }}
        >
          重置
        </button>
        <span className="hint">跑完全程 {ANIM_PERIOD_MS} ms</span>
      </div>

      {/* 两个立方体在同一条轨道上赛跑：红色永远落在绿色后面 */}
      <div className="stack" style={{ gap: 6 }}>
        <span className="hint" style={{ fontSize: 12, textAlign: 'center' }}>
          <b style={{ color: 'var(--success)' }}>绿 = useLayoutEffect</b>（绘制前同步，跑在前面）
          &nbsp;·&nbsp;
          <b style={{ color: 'var(--error)' }}>红 = useEffect</b>（绘制后同步，永远慢一拍）
        </span>
        <div className="effect-stage effect-stage--race">
          {/* 底层：useLayoutEffect 立方体（绿） */}
          <div ref={layoutCubeRef} className="effect-cube effect-cube--good">
            {CUBE_FACES.map((face) => (
              <div key={face} className={`effect-cube__face effect-cube__face--${face}`} />
            ))}
          </div>
          {/* 拖影：useEffect 立方体最近几帧的幽灵（固定 4 个，越旧越淡） */}
          <div ref={ghost1Ref} className="effect-ghost effect-ghost--1">
            {CUBE_FACES.map((face) => (
              <div key={face} className={`effect-cube__face effect-cube__face--${face}`} />
            ))}
          </div>
          <div ref={ghost2Ref} className="effect-ghost effect-ghost--2">
            {CUBE_FACES.map((face) => (
              <div key={face} className={`effect-cube__face effect-cube__face--${face}`} />
            ))}
          </div>
          <div ref={ghost3Ref} className="effect-ghost effect-ghost--3">
            {CUBE_FACES.map((face) => (
              <div key={face} className={`effect-cube__face effect-cube__face--${face}`} />
            ))}
          </div>
          <div ref={ghost4Ref} className="effect-ghost effect-ghost--4">
            {CUBE_FACES.map((face) => (
              <div key={face} className={`effect-cube__face effect-cube__face--${face}`} />
            ))}
          </div>
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
          <b>useEffect</b> 在浏览器绘制之后才执行：动画每一帧算出的新位置，要等到<b>下一帧</b>才生效 ——
          红色立方体永远<b>落在绿色后面</b>，还拖着一串残影。
        </span>
      </div>

      <div className="verdict verdict--good">
        <span className="verdict__icon">✅</span>
        <span>
          <b>useLayoutEffect</b> 在浏览器绘制之前同步执行：位置修正和 DOM 更新在<b>同一帧</b>完成 ——
          绿色立方体和动画帧严丝合缝，<b>永远跑在最前面</b>。
        </span>
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
        desc="两个 3D 立方体在同一条轨道上赛跑，唯一区别是用哪种 effect 同步位置。红色 useEffect 永远落在后面、拖着一串残影；绿色 useLayoutEffect 永远跑在最前面。"
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
