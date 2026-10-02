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
  config: { theme: string }
  onSelect: () => void
}

const MemoChild = memo(function MemoChild({ tag, config, onSelect }: MemoChildProps) {
  return (
    <HeavyBox name={tag} note={`config.theme = ${config.theme}`}>
      <button type="button" className="btn" onClick={onSelect}>
        选中这一行
      </button>
    </HeavyBox>
  )
})

function UnstablePropsDemo() {
  const renders = useRenderCount('Parent')
  const [tick, setTick] = useState(0)
  const [selected, setSelected] = useState('')

  // useMemo / useCallback 保证引用稳定，是让 memo 生效的前提
  const stableConfig = useMemo(() => ({ theme: 'dark' }), [])
  const handleSelectStable = useCallback(() => setSelected('稳定 props 那一行'), [])

  return (
    <div className="stack">
      <div className="row">
        <button type="button" className="btn" onClick={() => setTick((value) => value + 1)}>
          触发父组件重渲染：{tick}
        </button>
        <span className="hint">已选中：{selected || '（无）'}</span>
        <RenderBadge name="Parent" count={renders} />
      </div>

      <div className="grid-2">
        <MemoChild
          tag="memo + 不稳定 props"
          config={{ theme: 'dark' }}
          onSelect={() => setSelected('不稳定 props 那一行')}
        />
        <MemoChild tag="memo + 稳定 props" config={stableConfig} onSelect={handleSelectStable} />
      </div>

      <p className="hint">
        两边都套了 React.memo。左边每次重渲染都会创建新的对象和函数，浅比较必然失败；右边引用稳定，memo 才真正生效。
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
          另外要知道：<b>StrictMode + 开发环境</b>下 React 会故意双调用渲染函数来暴露副作用问题，
          所以下面的计数在生产构建里会更小。演示时只看「谁涨了、谁没涨」。
        </p>
      </Panel>

      <DemoCard
        title="Demo 1｜输入框一打字，整棵子树都在重渲染"
        tag="问题现场"
        tone="bad"
        desc="注意 SalesChart / OrderTable 和输入框毫无关系，却每次都跟着渲染。把顶栏的模拟耗时调到 10ms，打字会明显粘手。"
        points={[
          'React 没有像 Vue 那样的细粒度依赖追踪，父组件一渲染，默认会递归渲染所有子组件。',
          '卡顿的本质：输入 → setState → 重渲染一大棵树 → 浏览器主线程被占满 → 输入框掉帧。',
          '先用 React DevTools 的 Highlight updates 展示这个现象，再进入优化。',
        ]}
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
        points={[
          'memo 做的是浅比较（Object.is）：props 里每个字段的引用都没变，才跳过渲染。',
          'memo 只挡「父组件重渲染」这一种情况，挡不住自己的 state 和消费的 Context。',
          'memo 也有成本（要保存并比较上一次的 props），对渲染很轻的组件反而是负担 —— 优先给「渲染贵」的组件加。',
        ]}
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
        desc="左右两个子组件都用了 memo，但只有右边真正生效。"
        points={[
          'JSX 里写 config={{ theme: "dark" }} 或 onClick={() => {}}，每次渲染都会创建新引用。',
          '浅比较只看引用，不看内容，所以 memo 直接失效 —— 这是「加了 memo 却没效果」的第一大原因。',
          '解法：把对象/函数用 useMemo / useCallback 包起来，或者把它们移到组件外部（模块级常量）。',
          '排查技巧：React DevTools 里看这个组件的 props 为什么每次都变，一目了然。',
        ]}
        code={`// ❌ 每次渲染都是新对象 + 新函数 → memo 白加
<MemoChild config={{ theme: 'dark' }} onSelect={() => setSelected(id)} />

// ✅ 引用稳定 → memo 生效
const config = useMemo(() => ({ theme: 'dark' }), [])
const onSelect = useCallback(() => setSelected(id), [id])
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
        points={[
          'React 元素的引用没变时，React 会直接复用上一次的渲染结果（bailout）。',
          '这是一种「不用测 props 也能优化」的组件组合模式，在布局组件、Provider、表单容器里特别常用。',
          '实战意义：把频繁变化的状态关在一个小组件里（状态下沉），把静态子树通过 children 传进去。',
        ]}
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
        points={[
          'key 变了 → 卸载 + 重新挂载：DOM 重建、useState 重置、useEffect 重新执行。',
          'key 不变 → 复用：state 保留，只更新变化的 props。',
          '两个用法：① 用它重置组件状态（本项目顶栏的「重置计数」）；② 列表会增删改排序时，不要用 index 当 key（下一章演示）。',
        ]}
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
