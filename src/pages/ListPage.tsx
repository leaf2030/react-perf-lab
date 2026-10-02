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
        （开发环境有 StrictMode 双渲染和额外的检查，用 <code>npm run build</code> + <code>npm run preview</code> 看生产数据会更接近真实。）
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
  const items = useMemo(() => makeItems(50_000), [])
  const [scrollTop, setScrollTop] = useState(0)
  const [domCount, setDomCount] = useState(0)
  const innerRef = useRef<HTMLDivElement>(null)
  const { start, end } = useVirtualRange(items.length, scrollTop, 6)

  // 统计真实落在 DOM 里的行数，滚动时更新
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setDomCount(innerRef.current?.childElementCount ?? 0)
    })
    return () => cancelAnimationFrame(id)
  }, [start, end])

  const visible = items.slice(start, end)

  return (
    <div className="stack">
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
          <span className="stat__label">本次渲染的行数</span>
          <span className="stat__value stat--good">{end - start}</span>
        </div>
        <div className="stat">
          <span className="stat__label">当前渲染区间</span>
          <span className="stat__value" style={{ fontSize: 14 }}>
            {start} ~ {end}
          </span>
        </div>
      </div>

      <div
        className="vlist"
        style={{ height: VIEWPORT_HEIGHT }}
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      >
        {/* 撑开总高度，产生真实的滚动条 */}
        <div className="vlist__inner" style={{ height: items.length * ROW_HEIGHT }} ref={innerRef}>
          {visible.map((item, index) => (
            <VirtualRow key={item.id} item={item} top={(start + index) * ROW_HEIGHT} />
          ))}
        </div>
      </div>

      <p className="hint">
        5 万条数据，DOM 里始终只有十几个节点，首屏耗时和滚动帧率都是恒定的 —— 因为它只画"你看得见的那几行"。
      </p>
    </div>
  )
}

/* =========================================================================
   虚拟列表 + 搜索：演示虚拟化之后还有哪些坑
   ========================================================================= */

function SearchVirtualDemo() {
  const renders = useRenderCount('SearchVirtualDemo')
  const items = useMemo(() => makeItems(30_000), [])
  const [keyword, setKeyword] = useState('')
  const [scrollTop, setScrollTop] = useState(0)

  const filtered = useMemo(() => {
    const key = keyword.trim().toLowerCase()
    if (!key) return items
    return items.filter((item) => item.label.toLowerCase().includes(key))
  }, [items, keyword])

  const { start, end } = useVirtualRange(filtered.length, scrollTop, 6)
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
        <RenderBadge name="SearchVirtualDemo" count={renders} note={`命中 ${filtered.length} 条`} />
        <span className="hint">输入依然跟手，因为 DOM 里只有十几个节点</span>
      </div>

      <div className="vlist" style={{ height: VIEWPORT_HEIGHT }} onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}>
        <div className="vlist__inner" style={{ height: filtered.length * ROW_HEIGHT }}>
          {visible.map((item, index) => (
            <VirtualRow key={item.id} item={item} top={(start + index) * ROW_HEIGHT} />
          ))}
        </div>
      </div>

      <p className="hint">
        注意这里仍然有两个成本：① 每次输入都要 filter 30,000 条（已用 useMemo 限制在依赖变化时）；
        ② 列表为空时要渲染一个"没有结果"的占位，否则用户会以为列表挂了。
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
            <b>对比</b>：Vue 里大家会用 vue-virtual-scroller，React 里对应的是 react-window / react-virtualized / TanStack Virtual，
            原理完全一样 —— 只渲染可视区。
          </li>
          <li>
            自己手写一遍能理解所有细节（下面 50 行代码就够了），但生产环境请直接用成熟库，它们把动态行高、滚动容器、
            ResizeObserver 这些细节都处理好了。
          </li>
        </ul>
      </Panel>

      <DemoCard
        title="Demo 1｜朴素实现：有多少条数据就渲染多少个节点"
        tag="问题现场"
        tone="bad"
        desc="点不同的数据量，看两个指标：真实 DOM 节点数、渲染+提交耗时。请谨慎点击 50,000 条。"
        points={[
          '注意看：DOM 节点数和数据量是 1:1 的，耗时也线性增长。',
          '这一类卡顿是「一次性的」，但滚动时的掉帧是「持续的」—— 用户感受更差。',
          '有些人会先想到用 memo 优化行组件，但行组件的 props 其实没变，memo 帮不上忙：瓶颈在节点数量。',
          '分页也是一种解法：把"一次性渲染 5 万条"变成"每页 50 条"。虚拟化是"要保留连续滚动体验"时的方案。',
        ]}
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
        desc="滚动一下右侧列表，观察「真实 DOM 节点数」和「当前渲染区间」这两个指标。"
        points={[
          '三步走：① 用一个"撑高"的内层 div 撑出总高度（count × 行高），滚动条才正常；② 监听 scrollTop 算出可视区间；③ 只把这个区间（加 overscan 缓冲）的行用绝对定位渲染出来。',
          'overscan 是上下多渲染几行，避免快速滚动时出现白屏，一般 3~10 行。',
          '行组件要用 memo + 稳定的 key，否则滚动一次整个可见区都在重渲染。',
          '动态行高要复杂一些（需要测量每一行），生产环境建议直接用 TanStack Virtual 这类库。',
        ]}
        codeTone="good"
        code={`function useVirtualRange(count, scrollTop, overscan) {
  const first = Math.floor(scrollTop / ROW_HEIGHT)
  const start = Math.max(0, first - overscan)
  const visible = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + overscan * 2
  return { start, end: Math.min(count, start + visible) }
}

function VirtualList({ items }) {
  const [scrollTop, setScrollTop] = useState(0)
  const { start, end } = useVirtualRange(items.length, scrollTop, 6)

  return (
    <div style={{ height: 320, overflowY: 'auto' }}
         onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}>
      {/* 用总高度撑出滚动条 */}
      <div style={{ height: items.length * ROW_HEIGHT, position: 'relative' }}>
        {items.slice(start, end).map((item, i) => (
          <Row key={item.id} item={item} top={(start + i) * ROW_HEIGHT} />
        ))}
      </div>
    </div>
  )
}`}
      >
        <VirtualListDemo />
      </DemoCard>

      <DemoCard
        title="Demo 3｜虚拟化之后：搜索、筛选要怎么办"
        tag="实战细节"
        tone="default"
        desc="虚拟化解决了渲染，但筛选依然要遍历全量数据 —— 这时候该 useMemo 出场了。"
        points={[
          'filter 的成本是 O(n)，5 万条大约几毫秒，但每次按键都做就会累积成卡顿 → 用 useMemo 限制在 keyword 变化时。',
          '筛选后要重置 scrollTop，否则用户会看到"空列表"（其实是滚到了超出范围的位置）。',
          '数据量再大一个量级（几十万），就要考虑后端搜索 / 索引 / Web Worker 异步计算。',
          '如果输入框本身开始卡，就该上第 07 章的 useDeferredValue 了。',
        ]}
        code={`// 筛选 + 虚拟化组合
const filtered = useMemo(() => {
  const key = keyword.trim().toLowerCase()
  return key ? items.filter((i) => i.label.toLowerCase().includes(key)) : items
}, [items, keyword])

// 关键词变化时把滚动位置拉回顶部
onChange={(e) => { setKeyword(e.target.value); setScrollTop(0) }}`}
      >
        <SearchVirtualDemo />
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
