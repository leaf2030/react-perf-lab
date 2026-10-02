import { memo, Profiler, useCallback, useState, type ProfilerOnRenderCallback } from 'react'
import { DemoCard } from '../components/DemoCard'
import { PageHeader, Panel } from '../components/PageHeader'
import { RenderBadge } from '../components/RenderBadge'
import { simulateWork } from '../lib/perf'
import { useRenderCount } from '../lib/useRenderCount'

/* =========================================================================
   被测量的两棵树：一模一样的内容，只有「有没有做优化」的区别
   ========================================================================= */

const ITEM_COST_MS = 8
const ITEM_NAMES = ['卡片 A', '卡片 B', '卡片 C']

/** 未优化：每次父组件重渲染，这三张卡片都重新渲染 */
function NaiveItem({ name }: { name: string }) {
  const renders = useRenderCount(name)
  simulateWork(ITEM_COST_MS)
  return (
    <div className="heavy">
      <RenderBadge name={name} count={renders} note={`render 内耗时 ≈ ${ITEM_COST_MS}ms`} />
    </div>
  )
}

function NaiveContainer({ tick }: { tick: number }) {
  return (
    <div className="stack">
      <p className="hint" style={{ margin: 0 }}>
        tick = {tick}（只有这行文字依赖于 tick）
      </p>
      {ITEM_NAMES.map((name) => (
        <NaiveItem key={name} name={name} />
      ))}
    </div>
  )
}

/** 优化后：卡片被 memo 住，props 稳定 → tick 变化时它们不参与渲染 */
const MemoItem = memo(function MemoItem({ name }: { name: string }) {
  const renders = useRenderCount(name)
  simulateWork(ITEM_COST_MS)
  return (
    <div className="heavy heavy--light">
      <RenderBadge name={name} count={renders} tone="cool" note={`render 内耗时 ≈ ${ITEM_COST_MS}ms`} />
    </div>
  )
})

function OptimizedContainer({ tick }: { tick: number }) {
  return (
    <div className="stack">
      <p className="hint" style={{ margin: 0 }}>
        tick = {tick}（只有这行文字依赖于 tick）
      </p>
      {ITEM_NAMES.map((name) => (
        <MemoItem key={name} name={name} />
      ))}
    </div>
  )
}

/* =========================================================================
   仪表盘
   ========================================================================= */

type Commit = {
  id: string
  phase: 'mount' | 'update' | 'nested-update'
  actualDuration: number
  baseDuration: number
}

const ProfiledArea = memo(function ProfiledArea({
  tick,
  onRender,
}: {
  tick: number
  onRender: ProfilerOnRenderCallback
}) {
  return (
    <div className="grid-2">
      <div className="stack">
        <p className="hint">
          ① 未优化：<code>&lt;Profiler id=&quot;未优化&quot;&gt;</code>
        </p>
        <Profiler id="未优化" onRender={onRender}>
          <NaiveContainer tick={tick} />
        </Profiler>
      </div>

      <div className="stack">
        <p className="hint">
          ② 优化后：<code>&lt;Profiler id=&quot;优化后&quot;&gt;</code>
        </p>
        <Profiler id="优化后" onRender={onRender}>
          <OptimizedContainer tick={tick} />
        </Profiler>
      </div>
    </div>
  )
})

function CommitChart({ commits }: { commits: Commit[] }) {
  if (commits.length === 0) {
    return <p className="hint">还没有采集到数据，点上面的「触发一次重渲染」。</p>
  }

  const max = Math.max(...commits.map((item) => item.actualDuration), 0.1)

  return (
    <div className="bars">
      {commits.map((item, index) => (
        <div className="bar-row" key={`${item.id}-${item.phase}-${index}`}>
          <span>
            {item.id} · {item.phase}
          </span>
          <div className="bar-track">
            <div
              className={item.actualDuration > 5 ? 'bar-fill bar-fill--bad' : 'bar-fill'}
              style={{ width: `${Math.max((item.actualDuration / max) * 100, 1)}%` }}
            />
          </div>
          <span className="bar-val">{item.actualDuration.toFixed(1)} ms</span>
        </div>
      ))}
    </div>
  )
}

function ProfilerLab() {
  const [commits, setCommits] = useState<Commit[]>([])
  const [tick, setTick] = useState(0)

  // 用 useCallback 固定引用：否则 ProfiledArea 会被判定为 props 变了而重渲染
  const handleRender = useCallback<ProfilerOnRenderCallback>((id, phase, actualDuration, baseDuration) => {
    setCommits((previous) =>
      [{ id, phase, actualDuration, baseDuration }, ...previous].slice(0, 10),
    )
  }, [])

  const naive = commits.find((item) => item.id === '未优化')
  const optimized = commits.find((item) => item.id === '优化后')
  const saved = optimized ? optimized.baseDuration - optimized.actualDuration : 0

  return (
    <div className="stack">
      <div className="row">
        <button type="button" className="btn btn--primary" onClick={() => setTick((value) => value + 1)}>
          触发一次重渲染（tick + 1）
        </button>
        <button type="button" className="btn" onClick={() => setCommits([])}>
          清空采集
        </button>
        <span className="hint">每点一次，React 的 Profiler 回调都会被调用，把耗时记到下面的表里</span>
      </div>

      <ProfiledArea tick={tick} onRender={handleRender} />

      <div className="grid-2">
        <div className="panel" style={{ marginBottom: 0 }}>
          <h4 className="panel__title">最近几次 commit 的 actualDuration</h4>
          <CommitChart commits={commits} />
        </div>

        <div className="stat-grid" style={{ alignContent: 'start' }}>
          <div className="stat">
            <span className="stat__label">未优化 · actualDuration</span>
            <span className="stat__value stat--bad">
              {naive ? `${naive.actualDuration.toFixed(1)} ms` : '—'}
            </span>
          </div>
          <div className="stat">
            <span className="stat__label">优化后 · actualDuration</span>
            <span className="stat__value stat--good">
              {optimized ? `${optimized.actualDuration.toFixed(1)} ms` : '—'}
            </span>
          </div>
          <div className="stat">
            <span className="stat__label">优化后 · baseDuration（不 memo 的估算成本）</span>
            <span className="stat__value">
              {optimized ? `${optimized.baseDuration.toFixed(1)} ms` : '—'}
            </span>
          </div>
          <div className="stat">
            <span className="stat__label">memo 省下的时间</span>
            <span className="stat__value stat--good">{saved > 0 ? `≈ ${saved.toFixed(1)} ms` : '—'}</span>
          </div>
        </div>
      </div>

      <p className="hint">
        同一份数据、同一次点击：未优化的树每次都重新渲染三张卡片（约 24ms），优化后的树只渲染那行文字（不到 1ms）。
        <br />
        <b>actualDuration</b> = 这次提交里，这个子树真实花了多少时间；
        <b>baseDuration</b> = 如果整棵子树完全不 memo 化，重新渲染一次的预估时间。
        两者的差距就是「记忆化」帮你省下的时间。
      </p>
    </div>
  )
}

/* =========================================================================
   页面
   ========================================================================= */

export default function ProfilerPage() {
  return (
    <>
      <PageHeader
        index="08"
        title="用 Profiler 量化性能"
        subtitle="前面几章讲的都是「怎么优化」，这一章讲「怎么知道该优化哪里」。没有度量就动手，八成在浪费时间。"
        tags={['<Profiler>', 'React DevTools', 'actualDuration', '火焰图']}
      />

      <Panel title="两种度量手段，先讲内置的">
        <div className="grid-2">
          <div>
            <h4 className="panel__title">① React DevTools 的 Profiler 面板</h4>
            <ul className="checklist">
              <li>火焰图（Flamegraph）：宽度 = 该组件这次渲染花的时间，一眼看出谁最贵。</li>
              <li>Ranked：按耗时排序，最快定位「最贵的 10 个组件」。</li>
              <li>点击任意组件可以看到「为什么渲染」「哪些 props/state 变了」。</li>
              <li>适合排查：「我点了这个按钮，到底哪些组件重渲染了」。</li>
            </ul>
          </div>
          <div>
            <h4 className="panel__title">② 代码里的 &lt;Profiler&gt; 组件</h4>
            <ul className="checklist">
              <li>可以长期埋在代码里，把耗时上报到监控平台，观察线上趋势。</li>
              <li>能拿到 actualDuration / baseDuration / phase / commitTime。</li>
              <li>适合做「优化前 vs 优化后」的量化对比 —— 本章的 Demo 就是这个用法。</li>
              <li>注意：Profiler 本身有开销，别在热路径上塞太多个。</li>
            </ul>
          </div>
        </div>
      </Panel>

      <DemoCard
        title="实时测量：同一份内容，优化前后差多少毫秒"
        tag="动手环节"
        tone="default"
        desc="两个子树内容完全相同，都渲染三张「很贵」的卡片。唯一区别是右边用了 memo + 稳定 props。点几次按钮看数字。"
        points={[
          '每次点击都会触发一次「父组件重渲染」：左边的三张卡片全部重渲染，右边的被 memo 挡住了。',
          'baseDuration 是最有说服力的指标：它代表"如果不做任何记忆化，这次渲染要花多久"。',
          '第一次渲染（phase = mount）两边都很慢，这是正常的 —— mount 本来就要创建整个 DOM 树。',
          '真实的排查流程：先用 DevTools 找到最贵的组件 → 判断它「为什么渲染」→ 选择 memo / 状态下沉 / children 插槽 → 再用 Profiler 对比数字。',
        ]}
        code={`import { Profiler } from 'react'

// onRender 签名（6 个参数）
const onRender: ProfilerOnRenderCallback = (id, phase, actualDuration, baseDuration) => {
  // phase: 'mount' | 'update' | 'nested-update'
  report({ id, phase, actualDuration, baseDuration })
}

<Profiler id="商品列表" onRender={onRender}>
  <ProductList />
</Profiler>`}
      >
        <ProfilerLab />
      </DemoCard>

      <Panel title="指标怎么读">
        <table className="table">
          <thead>
            <tr>
              <th>指标</th>
              <th>含义</th>
              <th>怎么用</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>actualDuration</code>
              </td>
              <td>本次提交中，这个子树真实消耗的时间</td>
              <td>看优化是否生效，以及最贵的子树是谁</td>
            </tr>
            <tr>
              <td>
                <code>baseDuration</code>
              </td>
              <td>假设子树内所有组件都重新渲染一次的估算耗时</td>
              <td>actual 远小于 base ⇒ 记忆化在起作用</td>
            </tr>
            <tr>
              <td>
                <code>phase</code>
              </td>
              <td>
                <code>mount</code> 首次挂载 / <code>update</code> 更新 / <code>nested-update</code> 由副作用触发
              </td>
              <td>mount 慢不用慌，重点是 update</td>
            </tr>
            <tr>
              <td>
                <code>commitTime</code>
              </td>
              <td>这次提交发生的时间戳</td>
              <td>可以把多次渲染的时间轴对齐起来分析</td>
            </tr>
          </tbody>
        </table>
      </Panel>

      <Panel title="生产环境怎么测（可选）">
        <ul className="checklist">
          <li>
            默认的生产构建里，DevTools 的 Profiler 火焰图是看不到细节的（React 会去掉 debug 信息）。
            需要换成 <code>react-dom/profiling</code> 这个构建版本。
          </li>
          <li>
            用打包工具的 alias 在「性能排查环境」下切换到 profiling 版本，线上正常环境不要开：
            它会让包体积和运行开销都变大。
          </li>
          <li>更轻量的做法：只采集 Web Vitals（LCP / INP / CLS）+ 关键交互耗时，上报到监控平台。</li>
          <li>先定义一个「基线」：优化前是多少、目标是多少，数字才有意义。</li>
        </ul>
        <p className="hint">
          顺手推荐一个小工具：<code>@welldone-software/why-did-you-render</code>，它会在控制台直接打印
          「这个组件为什么重渲染（哪个 prop 变了）」，排查阶段非常好用。
        </p>
      </Panel>

      <Panel title="优化流程 Checklist">
        <ol className="steps">
          <li>确认「慢」是真的慢：用 DevTools Performance 面板看是 JS 长任务、布局抖动，还是网络。</li>
          <li>用 Profiler 找到最贵的组件（Ranked 视图）。</li>
          <li>判断它「为什么渲染」：父组件带的？自己的 state？Context？</li>
          <li>选一个成本最低的手段：状态下沉 / children 插槽 / memo / 虚拟化 / 拆包。</li>
          <li>再测一次，确认数字真的降下来了 —— 没降就回滚，别留着增加复杂度。</li>
        </ol>
      </Panel>
    </>
  )
}
