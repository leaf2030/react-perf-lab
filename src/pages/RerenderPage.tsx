import { memo, useCallback, useMemo, useState, type ReactNode } from 'react'
import { DemoCard } from '../components/DemoCard'
import { HeavyBox } from '../components/HeavyBox'
import { PageHeader, Panel } from '../components/PageHeader'
import { RenderBadge } from '../components/RenderBadge'
import { useRenderCount } from '../lib/useRenderCount'

/* =========================================================================
   Demo 1：父组件重渲染 → 整棵子树跟着重渲染
   ========================================================================= */

function ParentCascade() {
  const renders = useRenderCount('Parent')
  const [text, setText] = useState('')
  const [tick, setTick] = useState(0)

  return (
    <div className="stack">
      <div className="row">
        <input
          type="text"
          value={text}
          placeholder="在这里快速打字，感受一下卡顿"
          onChange={(event) => setText(event.target.value)}
        />
        <button type="button" className="btn" onClick={() => setTick((value) => value + 1)}>
          和输入框无关的另一个状态：{tick}
        </button>
        <RenderBadge name="Parent" count={renders} />
      </div>

      <div className="grid-2">
        <HeavyBox name="SalesChart" note="props 从未变过" />
        <HeavyBox name="OrderTable" note="props 从未变过" />
      </div>

      <p className="hint">
        每敲一个字，两个子组件的计数都会 +1：父组件重渲染，整棵子树跟着重渲染 —— 这就是 React 性能问题最常见的来源。
      </p>
    </div>
  )
}

/* =========================================================================
   Demo 2：React.memo，props 是原始类型时最有效
   ========================================================================= */

const MemoChart = memo(function MemoChart({ title }: { title: string }) {
  return <HeavyBox name="SalesChart（memo）" note={`props: title="${title}"`} />
})

function MemoFixedParent() {
  const renders = useRenderCount('Parent')
  const [text, setText] = useState('')

  return (
    <div className="stack">
      <div className="row">
        <input
          type="text"
          value={text}
          placeholder="继续快速打字"
          onChange={(event) => setText(event.target.value)}
        />
        <RenderBadge name="Parent" count={renders} />
      </div>

      <div className="grid-2">
        <HeavyBox name="RawChart（无 memo）" note="props 从未变过" />
        <MemoChart title="销售额" />
      </div>

      <p className="hint">
        打字时左边的计数一路飙升，右边的徽章停住不动 —— 因为 memo 的浅比较发现 props 没变，直接复用了上一次的渲染结果。
      </p>
    </div>
  )
}

/* =========================================================================
   Demo 3：memo 的四种失效场景（这里演示最经典的两种：新对象 / 新函数）
   ========================================================================= */

type MemoChildProps = {
  tag: string
  config: { theme: string; token: string }
  onSelect: () => void
}

const MemoChild = memo(function MemoChild({ tag, config, onSelect }: MemoChildProps) {
  return (
    <HeavyBox name={tag} note={`config 引用号：${config.token}`}>
      <button type="button" className="btn" onClick={onSelect}>
        调用 onSelect（看控制台）
      </button>
    </HeavyBox>
  )
})

// 模块级引用计数器：给每个新创建的对象发一个「身份证号」
// 号变 = 引用变（新对象）；号不变 = 引用没变（同一个对象）
let tokenSeq = 0
const nextToken = () => `#${++tokenSeq}`

function UnstablePropsDemo() {
  const renders = useRenderCount('Parent')
  const [tick, setTick] = useState(0)

  // ❌ 每次父组件渲染，这两行都会重新执行 → 生成全新的对象和函数
  const unstableConfig = { theme: 'dark', token: nextToken() }
  const unstableSelect = () => console.info('点的是「不稳定」那一行')

  // ✅ useMemo / useCallback 保证引用恒定：只创建一次，之后反复复用同一个
  const stableConfig = useMemo(() => ({ theme: 'dark', token: nextToken() }), [])
  const stableSelect = useCallback(() => console.info('点的是「稳定」那一行'), [])

  return (
    <div className="stack">
      <div className="row">
        <button type="button" className="btn" onClick={() => setTick((value) => value + 1)}>
          触发父组件重渲染：{tick}
        </button>
        <RenderBadge name="Parent" count={renders} />
      </div>

      <div className="grid-2">
        <div className="stack">
          <p className="hint" style={{ margin: 0 }}>
            ❌ 每次渲染都新建 config / onSelect
          </p>
          <MemoChild tag="memo + 不稳定 props" config={unstableConfig} onSelect={unstableSelect} />
        </div>
        <div className="stack">
          <p className="hint" style={{ margin: 0 }}>
            ✅ useMemo / useCallback 固定引用
          </p>
          <MemoChild tag="memo + 稳定 props" config={stableConfig} onSelect={stableSelect} />
        </div>
      </div>

      <p className="hint">
        点「触发父组件重渲染」：左边的引用号每次都变（新对象 → 浅比较失败 → memo 白加），
        右边的引用号永远是同一个（memo 真正生效 → 徽章不动）。
      </p>
    </div>
  )
}

/* =========================================================================
   Demo 4：children 插槽 —— 不写 memo 也能避免重渲染
   ========================================================================= */

function ExpensiveStaticPanel() {
  return <HeavyBox name="ExpensiveStatic" note="这棵子树只会渲染一次" />
}

function StatefulShell({ children }: { children: ReactNode }) {
  const renders = useRenderCount('StatefulShell')
  const [tick, setTick] = useState(0)

  return (
    <div className="stack">
      <div className="row">
        <button type="button" className="btn" onClick={() => setTick((value) => value + 1)}>
          Shell 内部状态 +1：{tick}
        </button>
        <RenderBadge name="StatefulShell" count={renders} />
      </div>

      <div className="grid-2">
        <HeavyBox name="InlineChild" note="直接写在 Shell 的 JSX 里" />
        {children}
      </div>

      <p className="hint">
        InlineChild 每次跟着重渲染；而由外部通过 children 传进来的 JSX，元素引用没变，React 直接跳过整棵子树的渲染。
      </p>
    </div>
  )
}

function ChildrenSlotDemo() {
  // 这个组件自身不会重渲染，所以 <ExpensiveStaticPanel /> 这个「元素对象」始终是同一个
  return (
    <StatefulShell>
      <ExpensiveStaticPanel />
    </StatefulShell>
  )
}

/* =========================================================================
   Demo 5：key 决定了「复用」还是「重建」
   ========================================================================= */

function LocalStateChild({ tag }: { tag: string }) {
  const renders = useRenderCount(tag)
  const [local, setLocal] = useState(0)

  return (
    <div className="heavy heavy--light">
      <RenderBadge name={tag} count={renders} note={`内部 state = ${local}`} tone="cool" />
      <button type="button" className="btn" onClick={() => setLocal((value) => value + 1)}>
        内部 state +1
      </button>
    </div>
  )
}

function KeyDemo() {
  const [version, setVersion] = useState(0)

  return (
    <div className="stack">
      <div className="row">
        <button type="button" className="btn" onClick={() => setVersion((value) => value + 1)}>
          父组件重渲染（version = {version}）
        </button>
      </div>

      <div className="grid-2">
        <div className="stack">
          <p className="hint">key 固定 → 组件被复用，内部 state 保留</p>
          <LocalStateChild tag="key 固定" />
        </div>
        <div className="stack">
          <p className="hint">key 随 version 变化 → 组件被销毁重建，内部 state 归零</p>
          <LocalStateChild key={version} tag="key 变化" />
        </div>
      </div>

      <p className="hint">
        先把右边的「内部 state」点几次，再点父组件按钮：右边立刻归零。这正是页面顶部「↻ 重置计数」按钮的实现原理。
      </p>
    </div>
  )
}

/* =========================================================================
   页面
   ========================================================================= */

export default function RerenderPage() {
  return (
    <>
      <PageHeader
        index="01"
        title="重渲染机制 & React.memo"
        subtitle="React 的性能优化，本质是在回答一个问题：这次渲染，真的有必要吗？先把「谁重渲染了、为什么」看清楚。"
        tags={['memo', 'children 插槽', 'key', '渲染计数']}
      />

      <Panel title="先建立心智模型">
        <div className="grid-3">
          <div className="stat">
            <span className="stat__label">render（渲染阶段）</span>
            <span className="stat__value" style={{ fontSize: 14 }}>
              调用组件函数、计算 JSX
            </span>
          </div>
          <div className="stat">
            <span className="stat__label">reconcile（协调）</span>
            <span className="stat__value" style={{ fontSize: 14 }}>
              diff 新旧元素树
            </span>
          </div>
          <div className="stat">
            <span className="stat__label">commit（提交阶段）</span>
            <span className="stat__value" style={{ fontSize: 14 }}>
              把差异写进真实 DOM
            </span>
          </div>
        </div>

        <p className="hint mt-12">
          「重渲染」指的是前两步。组件函数被执行 ≠ DOM 被更新 —— 但组件函数本身很贵（要重新算派生数据、重新建整棵子树），
          所以我们要尽量跳过它。
        </p>

        <table className="table mt-12">
          <thead>
            <tr>
              <th>触发重渲染的原因</th>
              <th>能否用 memo 挡掉</th>
              <th>对应的解法</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>父组件重渲染（props 没变）</td>
              <td>✅ 能</td>
              <td>
                <code>React.memo</code> / children 插槽
              </td>
            </tr>
            <tr>
              <td>自己的 state 变化</td>
              <td>❌ 不能</td>
              <td>状态下沉、拆分组件</td>
            </tr>
            <tr>
              <td>消费的 Context value 变化</td>
              <td>❌ 不能</td>
              <td>拆分 Context / 外部 store 订阅</td>
            </tr>
            <tr>
              <td>订阅的外部 store 变化（useSyncExternalStore）</td>
              <td>❌ 不能</td>
              <td>selector 精确订阅</td>
            </tr>
          </tbody>
        </table>

        <p className="hint mt-12">
          下面的计数是真实的渲染次数（已移除 StrictMode，每次更新渲染函数只执行一次）。
        </p>
      </Panel>

      <DemoCard
        title="Demo 1｜输入框一打字，整棵子树都在重渲染"
        tag="问题现场"
        tone="bad"
        desc="SalesChart / OrderTable 和输入框毫无关系，却每次都跟着渲染。"
        code={`function Parent() {
  const [text, setText] = useState('')

  return (
    <div>
      <input value={text} onChange={(e) => setText(e.target.value)} />

      {/* 这两个组件跟 text 没有任何关系，但每次输入都会被重新渲染 */}
      <SalesChart />
      <OrderTable />
    </div>
  )
}`}
      >
        <ParentCascade />
      </DemoCard>

      <DemoCard
        title="Demo 2｜加上 React.memo，props 不变就跳过渲染"
        tag="第一层优化"
        tone="good"
        desc="右边套一层 memo 就够了，因为它的 props 是原始类型。"
        codeTone="good"
        code={`// ✅ props 是原始类型，memo 效果最好
const SalesChart = memo(function SalesChart({ title }: { title: string }) {
  return <Chart data={expensiveCompute(title)} />
})

// ❌ props 里带引用类型 / 回调，浅比较几乎必然失败
<SalesChart data={{ list }} onPick={() => {}} />

// ✅ 想让它生效，就必须让引用稳定（见 Demo 3）
const data = useMemo(() => ({ list }), [list])
const onPick = useCallback(() => {}, [])
<SalesChart data={data} onPick={onPick} />`}
      >
        <MemoFixedParent />
      </DemoCard>

      <DemoCard
        title="Demo 3｜memo 失效的经典场景：新对象 / 新函数"
        tag="高频坑"
        tone="bad"
        desc="左右都套了 memo。点按钮看两边的「引用号」：左边每次都变，右边永远是同一个 —— 引用变了 memo 就失效，引用稳定 memo 才生效。"
        code={`// ❌ 每次渲染都是新对象 + 新函数 → memo 白加
<MemoChild config={{ theme: 'dark' }} onSelect={() => doSomething()} />

// ✅ 引用稳定 → memo 生效
const config = useMemo(() => ({ theme: 'dark' }), [])
const onSelect = useCallback(() => doSomething(), [])
<MemoChild config={config} onSelect={onSelect} />

// ✅ 更好的写法：把不变的配置提到模块级，连 useMemo 都省了
const CONFIG = { theme: 'dark' }
<MemoChild config={CONFIG} onSelect={onSelect} />`}
      >
        <UnstablePropsDemo />
      </DemoCard>

      <DemoCard
        title="Demo 4｜children 插槽：不用 memo 也能跳过渲染"
        tag="进阶技巧"
        tone="good"
        desc="把「不依赖当前 state 的子树」当作 children 传进去，它在父组件重渲染时不会重新渲染。"
        codeTone="good"
        code={`// ❌ 静态子树写在里面，跟着 Shell 一起重渲染
function Shell() {
  const [tick, setTick] = useState(0)
  return (
    <div>
      <button onClick={() => setTick(tick + 1)}>{tick}</button>
      <ExpensiveStatic />      {/* 每次都重渲染 */}
    </div>
  )
}

// ✅ 静态子树从外部传进来，元素引用不变 → 跳过渲染
function Shell({ children }: { children: ReactNode }) {
  const [tick, setTick] = useState(0)
  return (
    <div>
      <button onClick={() => setTick(tick + 1)}>{tick}</button>
      {children}               {/* 引用没变，不会重渲染 */}
    </div>
  )
}

// 调用方：这个组件自己不会重渲染，children 元素就一直是同一个对象
<Shell>
  <ExpensiveStatic />
</Shell>`}
      >
        <ChildrenSlotDemo />
      </DemoCard>

      <DemoCard
        title="Demo 5｜key 决定组件是「复用」还是「推倒重建」"
        tag="机制补充"
        tone="default"
        desc="改变 key 会让 React 认为这是一个全新的组件：旧组件被卸载、新组件被挂载，内部 state 全部丢失。"
        code={`// 用 key 强制重置：不想手写 reset 逻辑时非常好用
<ProfileForm key={userId} userId={userId} />

// 列表里用稳定 id，而不是 index
{items.map((item) => <Row key={item.id} item={item} />)}`}
      >
        <KeyDemo />
      </DemoCard>

      <Panel title="本章小结">
        <ul className="checklist">
          <li>先看清楚是谁在重渲染，再谈优化 —— DevTools 的 Highlight updates 是最快的入口。</li>
          <li>React.memo 只挡「父组件引起的重渲染」，且要求 props 引用稳定。</li>
          <li>children 插槽 / 状态下沉这两种结构优化，往往比到处加 memo 更有效。</li>
          <li>memo 的收益 = 省下的渲染成本 − 比较 props 的成本，不是所有组件都值得加。</li>
        </ul>
      </Panel>
    </>
  )
}
