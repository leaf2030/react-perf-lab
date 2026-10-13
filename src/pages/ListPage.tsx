import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { DemoCard } from '../components/DemoCard'
import { PageHeader, Panel } from '../components/PageHeader'
import { RenderBadge } from '../components/RenderBadge'
import { makeItems, type Item } from '../lib/perf'
import { useRenderCount } from '../lib/useRenderCount'

const ROW_HEIGHT = 36
const VIEWPORT_HEIGHT = 320
const NAIVE_OPTIONS = [2000, 5000, 20000, 50000]

/* =========================================================================
   朴素实现：有多少条数据就渲染多少个 DOM 节点
   ========================================================================= */

const NaiveRow = memo(function NaiveRow({ item }: { item: Item }) {
  return (
    <div className="nrow" style={{ height: ROW_HEIGHT }}>
      <span>
        <b>#{item.id}</b> {item.label}
      </span>
      <span className="vrow__price">¥{item.price}</span>
    </div>
  )
})

const NaiveRows = memo(function NaiveRows({ items }: { items: Item[] }) {
  return (
    <>
      {items.map((item) => (
        <NaiveRow key={item.id} item={item} />
      ))}
    </>
  )
})

function NaiveListDemo() {
  // 初始为 0：让本页可以快速打开，同时也让右边虚拟列表的测量不受干扰
  const [count, setCount] = useState(0)
  const [cost, setCost] = useState(0)
  const [domCount, setDomCount] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const items = useMemo(() => (count > 0 ? makeItems(count) : []), [count])

  function renderWith(n: number) {
    const started = performance.now()
    setCount(n)
    // 等到下一帧再测量：这一帧里完成了 render + reconcile + commit
    requestAnimationFrame(() => {
      setCost(performance.now() - started)
      setDomCount(listRef.current?.childElementCount ?? 0)
    })
  }

  return (
    <div className="stack">
      <div className="row">
        <span className="hint">渲染多少条：</span>
        {NAIVE_OPTIONS.map((n) => (
          <button
            key={n}
            type="button"
            className={n === count ? 'btn btn--primary' : 'btn'}
            onClick={() => renderWith(n)}
          >
            {n.toLocaleString()} 条
          </button>
        ))}
        <button type="button" className="btn" onClick={() => renderWith(0)}>
          清空
        </button>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <span className="stat__label">真实 DOM 节点数</span>
          <span className="stat__value stat--bad">{domCount.toLocaleString()}</span>
        </div>
        <div className="stat">
          <span className="stat__label">渲染 + 提交耗时（≈）</span>
          <span className="stat__value stat--bad">{cost > 0 ? `${cost.toFixed(0)} ms` : '—'}</span>
        </div>
      </div>

      <div className="naive-list" ref={listRef}>
        <NaiveRows items={items} />
      </div>

      <p className="hint">
        依次点 2,000 → 20,000 条，能明显感觉到页面「卡一下」：主线程全部花在创建 DOM 节点上，滚动条也会变得很重。
        （用 <code>npm run build</code> + <code>npm run preview</code> 看生产数据会更接近真实。）
      </p>
    </div>
  )
}

/* =========================================================================
   虚拟列表：只渲染可视区域
   ========================================================================= */

type Range = { start: number; end: number }

function useVirtualRange(count: number, scrollTop: number, overscan: number): Range {
  const first = Math.floor(scrollTop / ROW_HEIGHT)
  const start = Math.max(0, first - overscan)
  const visible = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + overscan * 2
  return { start, end: Math.min(count, start + visible) }
}

const VirtualRow = memo(function VirtualRow({ item, top }: { item: Item; top: number }) {
  return (
    <div className="vrow" style={{ top, height: ROW_HEIGHT }}>
      <span>
        <b>#{item.id}</b> {item.label}
      </span>
      <span className="vrow__price">¥{item.price}</span>
    </div>
  )
})

function VirtualListDemo() {
  const renders = useRenderCount('VirtualListDemo')
  const items = useMemo(() => makeItems(50_000), [])
  const [keyword, setKeyword] = useState('')
  const [scrollTop, setScrollTop] = useState(0)
  const [domCount, setDomCount] = useState(0)
  const innerRef = useRef<HTMLDivElement>(null)
  // 统计 filter 真正执行了多少次（用 ref 计数，避免计数本身触发重渲染）
  const filterRuns = useRef(0)

  // ✅ useMemo：只有 keyword 变了才重新 filter。
  // 滚动时 scrollTop 变 → 组件重渲染 → 但 keyword 没变 → 直接复用缓存。
  const filtered = useMemo(() => {
    filterRuns.current += 1
    const key = keyword.trim().toLowerCase()
    if (!key) return items
    return items.filter((item) => item.label.toLowerCase().includes(key))
  }, [items, keyword])

  const { start, end } = useVirtualRange(filtered.length, scrollTop, 6)

  // 统计真实落在 DOM 里的行数，滚动时更新
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setDomCount(innerRef.current?.childElementCount ?? 0)
    })
    return () => cancelAnimationFrame(id)
  }, [start, end])

  const visible = filtered.slice(start, end)

  return (
    <div className="stack">
      <div className="row">
        <input
          type="text"
          value={keyword}
          placeholder="搜索：试试输入 Item 88"
          onChange={(event) => {
            setKeyword(event.target.value)
            setScrollTop(0)
          }}
        />
        <RenderBadge name="VirtualListDemo" count={renders} note={`命中 ${filtered.length} 条`} />
      </div>

      <div className="stat-grid">
        <div className="stat">
          <span className="stat__label">数据总量</span>
          <span className="stat__value">50,000</span>
        </div>
        <div className="stat">
          <span className="stat__label">真实 DOM 节点数</span>
          <span className="stat__value stat--good">{domCount}</span>
        </div>
        <div className="stat">
          <span className="stat__label">组件重渲染次数</span>
          <span className="stat__value stat--bad">{renders}</span>
        </div>
        <div className="stat">
          <span className="stat__label">filter 真正执行次数</span>
          <span className="stat__value stat--good">{filterRuns.current}</span>
        </div>
      </div>

      <div
        className="vlist"
        style={{ height: VIEWPORT_HEIGHT }}
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      >
        {/* 撑开总高度，产生真实的滚动条 */}
        <div className="vlist__inner" style={{ height: filtered.length * ROW_HEIGHT }} ref={innerRef}>
          {visible.map((item, index) => (
            <VirtualRow key={item.id} item={item} top={(start + index) * ROW_HEIGHT} />
          ))}
        </div>
      </div>

      <p className="hint">
        5 万条数据，DOM 里始终只有十几个节点，首屏耗时和滚动帧率都是恒定的 —— 因为它只画"你看得见的那几行"。
      </p>
      <p className="hint">
        <b>滚动列表</b>：组件重渲染次数疯涨，但 filter 执行次数纹丝不动 —— 因为滚动只改了 scrollTop，
        keyword 没变，useMemo 直接复用上次结果。这就是 useMemo 在这里的全部功劳。
      </p>
      <p className="hint">
        <b>输入关键词</b>：filter 执行次数会 +1，50,000 条该遍历还是遍历 —— useMemo 救不了这个。
        输入卡顿的正解是防抖（debounce）、Web Worker，或者干脆把搜索交给后端。
      </p>
    </div>
  )
}

/* =========================================================================
   页面
   ========================================================================= */

export default function ListPage() {
  return (
    <>
      <PageHeader
        index="05"
        title="长列表虚拟化"
        subtitle="渲染 5 万行数据却只有十几个 DOM 节点。虚拟化（windowing）是列表性能优化里唯一「降维打击」级别的手段。"
        tags={['虚拟滚动', 'windowing', 'DOM 数量', 'memo 行组件']}
      />

      <Panel title="为什么长列表一定会卡">
        <ul className="checklist">
          <li>
            <b>创建 DOM 节点的成本</b>：React 要为每一行创建元素对象、fiber 节点，浏览器还要做样式计算和布局。
          </li>
          <li>
            <b>内存成本</b>：几万个 DOM 节点会一直占着内存，滚动时浏览器的重绘压力也更大。
          </li>
          <li>
            <b>对比</b>：Vue 里通常用 vue-virtual-scroller，React 里对应的是 react-window / react-virtualized / TanStack Virtual，
            原理完全一样 —— 只渲染可视区。
          </li>
          <li>
            自己手写一遍能理解细节，生产环境直接用成熟库，它们把动态行高、滚动容器、
            ResizeObserver 这些细节都处理好了。
          </li>
        </ul>
      </Panel>

      <DemoCard
        title="Demo 1｜朴素实现：有多少条数据就渲染多少个节点"
        tag="问题现场"
        tone="bad"
        desc="点不同的数据量，看两个指标：真实 DOM 节点数、渲染+提交耗时。"
        code={`// 朴素做法：数据有多少，就渲染多少
function List({ items }) {
  return (
    <div className="list">
      {items.map((item) => <Row key={item.id} item={item} />)}
    </div>
  )
}

// 50000 条 = 50000 个 DOM 节点 + 50000 个 fiber 节点`}
      >
        <NaiveListDemo />
      </DemoCard>

      <DemoCard
        title="Demo 2｜虚拟列表：5 万条数据，DOM 里只有 20 来个节点"
        tag="核心方案"
        tone="good"
        desc="滚动列表，观察「真实 DOM 节点数」始终只有十几个；再输入关键词搜索，观察「组件重渲染次数」疯涨但「filter 执行次数」纹丝不动。"
        codeTone="good"
        code={`function useVirtualRange(count, scrollTop, overscan) {
  const first = Math.floor(scrollTop / ROW_HEIGHT)
  const start = Math.max(0, first - overscan)
  const visible = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + overscan * 2
  return { start, end: Math.min(count, start + visible) }
}

function VirtualList({ items }) {
  const [keyword, setKeyword] = useState('')
  const [scrollTop, setScrollTop] = useState(0)

  // ✅ 只有 keyword 变了才重新 filter；滚动时直接复用缓存
  const filtered = useMemo(() => {
    const key = keyword.trim().toLowerCase()
    return key ? items.filter((i) => i.label.toLowerCase().includes(key)) : items
  }, [items, keyword])

  const { start, end } = useVirtualRange(filtered.length, scrollTop, 6)

  return (
    <div style={{ height: 320, overflowY: 'auto' }}
         onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}>
      {/* 用总高度撑出滚动条 */}
      <div style={{ height: filtered.length * ROW_HEIGHT, position: 'relative' }}>
        {filtered.slice(start, end).map((item, i) => (
          <Row key={item.id} item={item} top={(start + i) * ROW_HEIGHT} />
        ))}
      </div>
    </div>
  )
}

// ⚠️ useMemo 只省掉了「滚动时的无谓重算」。
// 输入关键词时，5 万条该遍历还是遍历 —— 那要靠 debounce / Web Worker / 后端搜索。`}
      >
        <VirtualListDemo />
      </DemoCard>

      <Panel title="生态速查">
        <table className="table">
          <thead>
            <tr>
              <th>方案</th>
              <th>特点</th>
              <th>适用场景</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>TanStack Virtual</code>
              </td>
              <td>框架无关，支持动态行高、横向、网格</td>
              <td>新项目的首选</td>
            </tr>
            <tr>
              <td>
                <code>react-window</code>
              </td>
              <td>体积小、API 简单，固定/可变行高</td>
              <td>简单的长列表</td>
            </tr>
            <tr>
              <td>
                <code>react-virtuoso</code>
              </td>
              <td>自带"反向无限加载""分组"等能力</td>
              <td>聊天记录、动态流</td>
            </tr>
            <tr>
              <td>分页 / 无限滚动</td>
              <td>不需要引入依赖，实现简单</td>
              <td>用户不需要"任意跳转"的列表</td>
            </tr>
          </tbody>
        </table>
      </Panel>
    </>
  )
}
