import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DemoCard } from '../components/DemoCard'
import { PageHeader, Panel } from '../components/PageHeader'
import { RenderBadge } from '../components/RenderBadge'
import { makeItems, peekSink, type Item } from '../lib/perf'
import { useRenderCount } from '../lib/useRenderCount'

/* ---------- 公共：一份"很大"的数据 + 昂贵的筛选排序 ---------- */

const ITEMS: Item[] = makeItems(20_000)

function filterAndSort(items: Item[], keyword: string): Item[] {
  const key = keyword.trim().toLowerCase()
  const filtered = key ? items.filter((item) => item.label.toLowerCase().includes(key)) : items.slice()
  return filtered.sort((a, b) => b.price - a.price)
}

function ResultPreview({ result, limit = 8 }: { result: Item[]; limit?: number }) {
  if (result.length === 0) {
    return <p className="hint">没有匹配的数据</p>
  }
  return (
    <div className="hint">
      共 <b style={{ color: 'var(--accent)' }}>{result.length}</b> 条，前 {Math.min(limit, result.length)} 条：
      {result.slice(0, limit).map((item) => (
        <span key={item.id} className="tag" style={{ marginLeft: 6 }}>
          {item.label} ¥{item.price}
        </span>
      ))}
    </div>
  )
}

function CostStats({
  name,
  renders,
  calls,
  lastCost,
  totalCost,
}: {
  name: string
  renders: number
  calls: number
  lastCost: number
  totalCost: number
}) {
  return (
    <div className="stack" style={{ gap: 8 }}>
      <RenderBadge name={name} count={renders} tone={calls > 0 ? 'default' : 'cool'} />
      <div className="stat-grid">
        <div className="stat">
          <span className="stat__label">累计计算次数</span>
          <span className="stat__value">{calls}</span>
        </div>
        <div className="stat">
          <span className="stat__label">本次计算耗时</span>
          <span className="stat__value">{lastCost.toFixed(1)} ms</span>
        </div>
        <div className="stat">
          <span className="stat__label">累计计算耗时</span>
          <span className="stat__value stat--bad" style={{ color: 'var(--bad)' }}>
            {totalCost.toFixed(0)} ms
          </span>
        </div>
      </div>
    </div>
  )
}

/* ---------- Demo 1：昂贵计算的记忆化 ---------- */

function FilterWithoutMemo({ keyword, renders }: { keyword: string; renders: number }) {
  const stats = useRef({ calls: 0, total: 0 })

  const started = performance.now()
  const result = filterAndSort(ITEMS, keyword)
  const cost = performance.now() - started

  stats.current.calls += 1
  stats.current.total += cost

  return (
    <div className="panel panel--bad">
      <h4 className="panel__title">❌ 没有 useMemo：每次渲染都重算</h4>
      <CostStats
        name="WithoutMemo"
        renders={renders}
        calls={stats.current.calls}
        lastCost={cost}
        totalCost={stats.current.total}
      />
      <ResultPreview result={result} />
    </div>
  )
}

function FilterWithMemo({ keyword, renders }: { keyword: string; renders: number }) {
  const [calculated, setCalculated] = useState(0)
  const stats = useRef({ calls: 0, total: 0 })

  // 依赖只有 keyword：父组件因为别的状态重渲染时，这里会直接复用上一次的结果
  const [result, cost] = useMemo(() => {
    const started = performance.now()
    const data = filterAndSort(ITEMS, keyword)
    const elapsed = performance.now() - started

    // 只在「真的重算」的时候记账（StrictMode 下开发环境会把工厂函数调用两次）
    stats.current.calls += 1
    stats.current.total += elapsed

    return [data, elapsed] as const
  }, [keyword])

  // 仅用于展示"依赖变化了几次"，不影响计算
  useEffect(() => {
    setCalculated((value) => value + 1)
  }, [result])

  return (
    <div className="panel panel--good">
      <h4 className="panel__title">✅ 有 useMemo：依赖没变就复用结果</h4>
      <CostStats
        name="WithMemo"
        renders={renders}
        calls={stats.current.calls}
        lastCost={cost}
        totalCost={stats.current.total}
      />
      <p className="hint">useMemo 因依赖变化而重新计算：{calculated} 次</p>
      <ResultPreview result={result} />
    </div>
  )
}

function MemoCompareDemo() {
  const [keyword, setKeyword] = useState('')
  const [unrelated, setUnrelated] = useState(0)
  const leftRenders = useRenderCount('WithoutMemo 分支')
  const rightRenders = useRenderCount('WithMemo 分支')

  return (
    <div className="stack">
      <div className="row">
        <input
          type="text"
          value={keyword}
          placeholder="试试输入 Item 9（会真的重算）"
          onChange={(event) => setKeyword(event.target.value)}
        />
        <button type="button" className="btn" onClick={() => setUnrelated((value) => value + 1)}>
          只让父组件重渲染（keyword 不变）：{unrelated}
        </button>
      </div>

      <div className="grid-2">
        <FilterWithoutMemo keyword={keyword} renders={leftRenders} />
        <FilterWithMemo keyword={keyword} renders={rightRenders} />
      </div>

      <p className="hint">
        反复点「只让父组件重渲染」：左边的累计计算耗时不断上涨，右边因为依赖没变，直接复用上一次的结果。
        但注意 —— 一旦你改了输入框，两边都会重算，useMemo 救不了「依赖真的变了」。
      </p>
    </div>
  )
}

/* ---------- Demo 2：useCallback 的真正作用 ---------- */

function SubscriptionChild({ name, onChange }: { name: string; onChange: () => void }) {
  const renders = useRenderCount(name)
  const [subscribeTimes, setSubscribeTimes] = useState(0)

  useEffect(() => {
    // 模拟一次订阅（真实场景：addEventListener / WebSocket / 第三方 SDK）
    setSubscribeTimes((value) => value + 1)
    return () => {
      // 模拟取消订阅
    }
  }, [onChange])

  return (
    <div className="heavy">
      <RenderBadge name={name} count={renders} note={`重新订阅 ${subscribeTimes} 次`} />
      <span className="hint">
        useEffect 的依赖是 onChange。onChange 每次都是新函数 → 组件重渲染一次就重新订阅一次。
      </span>
    </div>
  )
}

function UseCallbackDemo() {
  const [tick, setTick] = useState(0)
  const stableHandler = useCallback(() => {
    console.info('订阅回调触发', peekSink())
  }, [])

  return (
    <div className="stack">
      <div className="row">
        <button type="button" className="btn" onClick={() => setTick((value) => value + 1)}>
          父组件重渲染：{tick}
        </button>
      </div>

      <div className="grid-2">
        <SubscriptionChild name="内联箭头函数" onChange={() => console.info('inline')} />
        <SubscriptionChild name="useCallback 包裹" onChange={stableHandler} />
      </div>

      <p className="hint">
        左边每点一次父组件按钮就「重新订阅」一次，右边只在挂载时订阅一次。
        （StrictMode 下初次挂载的 effect 会被执行两次，所以初始值可能是 2。）
      </p>
    </div>
  )
}

/* ---------- Demo 3：依赖数组写错的坑（闭包陷阱） ---------- */

function StaleClosureDemo() {
  const [text, setText] = useState('React')
  const [log, setLog] = useState<string[]>([])

  function append(line: string) {
    setLog((previous) => [line, ...previous].slice(0, 6))
  }

  // ❌ 空依赖数组：闭包永远捕获第一次渲染时的 text
  // （这里的"漏写依赖"是故意的，就是 Demo 的一部分，所以下面用注释关掉了这条规则）
  /* oxlint-disable react-hooks/exhaustive-deps */
  const stale = useCallback(() => {
    setTimeout(() => append(`❌ 空依赖数组读到的是旧值：${text}`), 600)
  }, [])
  /* oxlint-enable react-hooks/exhaustive-deps */

  // ✅ 正确声明依赖：每次 text 变化都会拿到新的函数
  const fresh = useCallback(() => {
    setTimeout(() => append(`✅ 正确依赖读到的是新值：${text}`), 600)
  }, [text])

  return (
    <div className="stack">
      <div className="row">
        <input
          type="text"
          value={text}
          placeholder="先改成别的值，再点下面两个按钮"
          onChange={(event) => setText(event.target.value)}
        />
        <button type="button" className="btn" onClick={stale}>
          用空依赖数组的回调
        </button>
        <button type="button" className="btn btn--primary" onClick={fresh}>
          用正确依赖的回调
        </button>
      </div>

      <div className="panel" style={{ marginBottom: 0 }}>
        <h4 className="panel__title">0.6 秒后的执行结果</h4>
        {log.length === 0 ? (
          <p className="hint">还没有日志</p>
        ) : (
          <ul className="checklist">
            {log.map((line, index) => (
              <li key={`${line}-${index}`}>{line}</li>
            ))}
          </ul>
        )}
      </div>

      <p className="hint">
        把输入框改成别的值，再点两个按钮：第一个打印的是「React」（挂载时的旧值），第二个才是你刚输入的内容。
        —— useCallback / useMemo 的依赖数组不是可有可无的提示，它决定了闭包里能看到哪一份数据。
      </p>
    </div>
  )
}

/* ---------- Demo 4：缓存的成本可能比计算本身还高 ---------- */

type BenchRow = { name: string; direct: number; cached: number; ratio: number }

function MemoCostDemo() {
  const [rows, setRows] = useState<BenchRow[]>([])

  function run() {
    const N = 500_000

    const t0 = performance.now()
    let sumA = 0
    for (let i = 0; i < N; i += 1) {
      sumA += i * 2 + 1 // 极廉价的计算
    }
    const direct = performance.now() - t0

    const t1 = performance.now()
    const cache = new Map<number, number>()
    let sumB = 0
    for (let i = 0; i < N; i += 1) {
      const hit = cache.get(i)
      if (hit !== undefined) {
        sumB += hit
      } else {
        const value = i * 2 + 1
        cache.set(i, value)
        sumB += value
      }
    }
    const cached = performance.now() - t1

    setRows([
      {
        name: `直接计算 ${N.toLocaleString()} 次`,
        direct,
        cached,
        ratio: cached / Math.max(direct, 0.01),
      },
    ])

    // 防止两个循环被优化掉
    if (sumA + sumB === -1) console.info('never')
  }

  const row = rows[0]

  return (
    <div className="stack">
      <div className="row">
        <button type="button" className="btn btn--primary" onClick={run}>
          跑一次微基准测试
        </button>
        <span className="hint">500,000 次 a = i * 2 + 1 的对比</span>
      </div>

      {row ? (
        <div className="stat-grid">
          <div className="stat">
            <span className="stat__label">直接计算</span>
            <span className="stat__value stat--good">{row.direct.toFixed(1)} ms</span>
          </div>
          <div className="stat">
            <span className="stat__label">加一层 Map 缓存</span>
            <span className="stat__value stat--bad">{row.cached.toFixed(1)} ms</span>
          </div>
          <div className="stat">
            <span className="stat__label">慢了</span>
            <span className="stat__value stat--bad">≈ {row.ratio.toFixed(1)} 倍</span>
          </div>
        </div>
      ) : null}

      <p className="hint">
        这不是严谨的性能测试，只是想说明一件事：<b>缓存本身要花时间</b>（建对象、比对依赖、存上一次的结果）。
        给「一行代码就能算完」的东西加 useMemo，很可能是在给自己减速。
      </p>
    </div>
  )
}

/* ---------- 页面 ---------- */

export default function MemoPage() {
  return (
    <>
      <PageHeader
        index="02"
        title="useMemo / useCallback"
        subtitle="这两个 Hook 是「引用稳定」的工具：useMemo 稳定值，useCallback 稳定函数。用错地方会变慢，用对地方能救命。"
        tags={['useMemo', 'useCallback', '引用相等', '闭包陷阱']}
      />

      <Panel title="三句话讲清定位">
        <ul className="checklist">
          <li>
            <code>useMemo(fn, deps)</code>：缓存 <b>计算结果</b>，依赖没变就复用。适合「计算很贵」或「需要稳定引用」。
          </li>
          <li>
            <code>useCallback(fn, deps)</code>：缓存 <b>函数本身</b>。它单独使用几乎没有意义，价值在于配合
            <code>React.memo</code> 的子组件、或作为其他 Hook 的依赖。
          </li>
          <li>
            两者都<b>不是语义保证</b>：React 在极端情况下有权丢弃缓存（比如低优先级渲染被中断）。副作用不能放进 useMemo。
          </li>
        </ul>
        <p className="hint mt-12">
          对照组：Vue 的 <code>computed</code> 是语言级的能力，框架帮你保证缓存；React 的 useMemo 是你手动告诉框架「可以复用」，
          写错依赖数组不会报错，只会得到 bug 或者卡顿。
        </p>
      </Panel>

      <DemoCard
        title="Demo 1｜昂贵计算：20,000 条数据的筛选 + 排序"
        tag="最典型的收益场景"
        tone="default"
        desc="左右两个分支拿到完全相同的 keyword，唯一区别是右边把计算结果放进了 useMemo。"
        code={`// ❌ 每次渲染都重新筛选 + 排序
const result = items.filter(...).sort(...)

// ✅ 只在 items / keyword 变化时重算
const result = useMemo(() => {
  return items.filter(...).sort(...)
}, [items, keyword])

// 也可以把计算本身提成纯函数，方便单测和复用
const result = useMemo(() => filterAndSort(items, keyword), [items, keyword])`}
      >
        <MemoCompareDemo />
      </DemoCard>

      <DemoCard
        title="Demo 2｜useCallback 真正的价值：让依赖保持稳定"
        tag="高频困惑点"
        tone="good"
        desc="很多人问「我加了 useCallback 怎么还是重渲染」。答案是：useCallback 本身不阻止重渲染，它只是让引用不变。"
        codeTone="good"
        code={`// ❌ 每次渲染都是新函数 → 子组件的 effect 每次都重跑（重新订阅）
<Child onChange={() => doSomething()} />

// ✅ 引用稳定 → 子组件不会因为"函数变了"而做重复工作
const onChange = useCallback(() => doSomething(), [])
<Child onChange={onChange} />

// 判断标准：这个值会不会被当作
//   ① memo 组件的 props  ② 其他 Hook 的依赖
// 如果都不会，就不需要 useCallback。`}
      >
        <UseCallbackDemo />
      </DemoCard>

      <DemoCard
        title="Demo 3｜依赖数组写错：闭包读到的是旧值"
        tag="最容易写出 bug 的地方"
        tone="bad"
        desc="把输入框改成别的值，再点两个按钮，看 0.6 秒后打印出来的东西有什么不同。"
        code={`// ❌ 空依赖 + 读取外部变量 = 永远读到挂载时的值
const handler = useCallback(() => {
  setTimeout(() => console.log(text), 600)
}, [])                       // text 变化时函数不会重建

// ✅ 老实的依赖数组
const handler = useCallback(() => {
  setTimeout(() => console.log(text), 600)
}, [text])

// ✅ 真的需要"稳定函数 + 最新值"时，用 ref 存最新值
const latest = useRef(text)
useEffect(() => { latest.current = text })
const handler = useCallback(() => {
  setTimeout(() => console.log(latest.current), 600)
}, [])`}
      >
        <StaleClosureDemo />
      </DemoCard>

      <DemoCard
        title="Demo 4｜反模式：给廉价计算加缓存"
        tag="不要过度优化"
        tone="default"
        desc="点一下按钮，看看「包一层缓存」比「直接算」慢多少倍。"
        code={`// ❌ 一行代码能算完的东西，不值得缓存
const fullName = useMemo(() => first + ' ' + last, [first, last])

// ✅ 直接算
const fullName = first + ' ' + last

// ❌ 只创建了一个简单对象，memo 的成本 > 收益
const style = useMemo(() => ({ color: 'red' }), [])

// ✅ 提到组件外部，几乎零成本
const STYLE = { color: 'red' } as const`}
      >
        <MemoCostDemo />
      </DemoCard>

      <Panel title="决策速查表">
        <table className="table">
          <thead>
            <tr>
              <th>场景</th>
              <th>要不要用</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>大数组 filter / sort / group</td>
              <td>✅ 用 useMemo</td>
              <td>典型收益场景，注意依赖要写全</td>
            </tr>
            <tr>
              <td>计算结果要传给 memo 子组件</td>
              <td>✅ 用 useMemo</td>
              <td>本质是为了引用稳定</td>
            </tr>
            <tr>
              <td>回调要传给 memo 子组件 / 当作 effect 依赖</td>
              <td>✅ 用 useCallback</td>
              <td>只有这两种情况才值得</td>
            </tr>
            <tr>
              <td>字符串拼接、简单数学运算</td>
              <td>❌ 不用</td>
              <td>缓存成本 &gt; 计算成本</td>
            </tr>
            <tr>
              <td>组件没有任何 memo 子组件</td>
              <td>❌ 不用 useCallback</td>
              <td>函数引用变了也没人在意</td>
            </tr>
          </tbody>
        </table>
      </Panel>
    </>
  )
}
