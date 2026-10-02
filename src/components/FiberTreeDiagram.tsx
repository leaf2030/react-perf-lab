/* ============================================================
   FiberTreeDiagram —— 首页开场的「React 渲染流水线」示意图

   面向 Vue 团队：他们不需要背 Fiber 的数据结构，但必须建立一个心智模型 ——
   一次 setState 之后，React 到底经历了哪三步，以及为什么这棵树的形状
   决定了「性能优化的主战场在哪」。

   全部用纯 CSS + 少量内联 SVG 连线绘制，不引入任何图表依赖。
   ============================================================ */

/** 左侧的流水线三步 */
const PHASES = [
  {
    no: '1',
    name: 'render 渲染阶段',
    en: '调用组件函数、生成新树',
    tone: 'primary',
    desc: '从上到下重新执行受影响的组件函数。这一步可以被中断、丢弃、重来。',
    spots: ['父组件重渲染就带上整棵子树', 'memo / useMemo 在这一步拦截'],
  },
  {
    no: '2',
    name: 'reconcile 协调',
    en: 'diff 新旧树，标出差异',
    tone: 'warning',
    desc: '逐节点比对新旧两棵树：类型变了就重建，key 变了就搬家，其余复用。',
    spots: ['key 用错会整段重建 DOM', '组件类型变了无法复用'],
  },
  {
    no: '3',
    name: 'commit 提交阶段',
    en: '把差异写进真实 DOM',
    tone: 'success',
    desc: '一次性、不可中断地把所有差异刷进真实 DOM，然后跑 useEffect。',
    spots: ['这一步才是浏览器真正「重绘」', 'useLayoutEffect 卡在这一步之前'],
  },
] as const

type LeafProps = {
  label: string
  note?: string
  tone?: 'root' | 'plain' | 'dirty' | 'pruned'
}

/** 一个树节点 */
function Node({ label, note, tone = 'plain' }: LeafProps) {
  return (
    <div className={`ftree__node ftree__node--${tone}`}>
      <span className="ftree__node-label">{label}</span>
      {note ? <span className="ftree__node-note">{note}</span> : null}
    </div>
  )
}

export function FiberTreeDiagram() {
  return (
    <div className="ftree">
      {/* ---------- 左：三步流水线 ---------- */}
      <div className="ftree__col ftree__col--phases">
        <div className="ftree__col-head">
          <span className="ftree__col-kicker">STEP BY STEP</span>
          <h3>一次 setState 之后，React 走了三步</h3>
        </div>

        <div className="ftree__phases">
          {PHASES.map((phase, i) => (
            <div className="ftree__phase-wrap" key={phase.no}>
              <div className={`ftree__phase ftree__phase--${phase.tone}`}>
                <span className="ftree__phase-no">{phase.no}</span>
                <div className="ftree__phase-body">
                  <div className="ftree__phase-title">
                    {phase.name}
                    <span className="ftree__phase-en">{phase.en}</span>
                  </div>
                  <p className="ftree__phase-desc">{phase.desc}</p>
                  <ul className="ftree__phase-spots">
                    {phase.spots.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              </div>
              {i < PHASES.length - 1 ? <div className="ftree__phase-arrow" aria-hidden="true" /> : null}
            </div>
          ))}
        </div>

        <div className="ftree__legend">
          <span className="ftree__legend-item">
            <i className="ftree__dot ftree__dot--dirty" />
            本次要重新执行的节点
          </span>
          <span className="ftree__legend-item">
            <i className="ftree__dot ftree__dot--pruned" />
            被 memo 挡住的节点（直接跳过）
          </span>
          <span className="ftree__legend-item">
            <i className="ftree__dot ftree__dot--plain" />
            未受影响的节点
          </span>
        </div>
      </div>

      {/* ---------- 右：Fiber 树 ---------- */}
      <div className="ftree__col ftree__col--tree">
        <div className="ftree__col-head">
          <span className="ftree__col-kicker">RENDER TREE</span>
          <h3>假设 App 里 state 变了</h3>
        </div>

        <div className="ftree__canvas">
          <div className="ftree__tree ftree__tree--root">
            <Node label="<App>" note="state 变了" tone="root" />

            {/* App 的子树：缩进 + 连接线，像文件树一样从上往下读 */}
            <div className="ftree__tree">
              <div className="ftree__item">
                <Node label="<Header>" note="memo ✅ 直接跳过" tone="pruned" />
              </div>
              <div className="ftree__item">
                <Node label="<Layout>" note="重新执行" tone="dirty" />
                <div className="ftree__tree">
                  <div className="ftree__item">
                    <Node label="<Sidebar>" note="重新执行" tone="dirty" />
                  </div>
                  <div className="ftree__item">
                    <Node label="<Content>" note="memo ❌ 没挡住" tone="dirty" />
                    <div className="ftree__tree">
                      <div className="ftree__item">
                        <Node label="<Chart>" note="重新执行" tone="dirty" />
                      </div>
                      <div className="ftree__item">
                        <Node label="<Table>" note="重新执行" tone="dirty" />
                      </div>
                      <div className="ftree__item">
                        <Node label="<Row> × 1000" note="整张表重算" tone="dirty" />
                      </div>
                      <div className="ftree__item">
                        <Node label="<Footer>" note="memo ✅ 直接跳过" tone="pruned" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="ftree__note">
            <b>看颜色就够：</b>一次 state 变化，红色的节点全部要重新执行组件函数。
            优化的全部努力，就是让这片红色变小 —— 而不是让红色跑得更快。
          </div>
        </div>
      </div>
    </div>
  )
}
