import { Alert, Card, Col, Row, Tag } from 'antd'

/* ============================================================
   FiberTreeDiagram —— 首页开场的「React 一次更新的完整流程」

   目标：给 Vue 团队讲清楚 Fiber 架构到底在干什么，尽量说人话。
   - 图：方框 = 做的事，菱形 = 判断，虚线框 = 浏览器泳道
   - 每个节点都是「白话标题 + 术语小字」，先听懂再记名字
   - 图下用卡片逐步展开，最后一句结论收口
   ============================================================ */

/** 蓝色流程框（做的事）：白话主标题 + 术语小字 */
function Box({
  x,
  y,
  w,
  h,
  title,
  sub,
  tone = 'blue',
}: {
  x: number
  y: number
  w: number
  h: number
  title: string
  sub?: string
  tone?: 'blue' | 'red' | 'plain'
}) {
  const cy = y + h / 2
  const palette = {
    blue: { fill: '#e6f4ff', stroke: '#91caff', title: '#0958d9' },
    red: { fill: '#fff2f0', stroke: '#ffa39e', title: '#cf1322' },
    plain: { fill: '#ffffff', stroke: '#d9d9d9', title: 'rgba(0,0,0,.88)' },
  }[tone]
  const titleY = sub ? cy - 5 : cy + 4
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={palette.fill} stroke={palette.stroke} strokeWidth={1.2} />
      <text x={x + w / 2} y={titleY} textAnchor="middle" fontSize={12.5} fontWeight={600} fill={palette.title}>
        {title}
      </text>
      {sub ? (
        <text x={x + w / 2} y={titleY + 17} textAnchor="middle" fontSize={10} fill="rgba(0,0,0,.55)">
          {sub}
        </text>
      ) : null}
    </g>
  )
}

/** 菱形判断节点 */
function Diamond({
  cx,
  cy,
  hw,
  hh,
  lines,
  tone = 'blue',
}: {
  cx: number
  cy: number
  hw: number
  hh: number
  lines: string[]
  tone?: 'blue' | 'red'
}) {
  const pts = `${cx - hw},${cy} ${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh}`
  const fill = tone === 'red' ? '#fff2f0' : '#e6f4ff'
  const stroke = tone === 'red' ? '#ffccc7' : '#91caff'
  const color = tone === 'red' ? '#cf1322' : '#0958d9'
  const start = cy - ((lines.length - 1) * 16) / 2
  return (
    <g>
      <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={1.2} />
      {lines.map((t, i) => (
        <text key={t} x={cx} y={start + i * 16 + 4} textAnchor="middle" fontSize={12} fontWeight={600} fill={color}>
          {t}
        </text>
      ))}
    </g>
  )
}

/** 带箭头的连线 */
function Arrow({ d }: { d: string }) {
  return <path d={d} fill="none" stroke="#8c8c8c" strokeWidth={1.3} markerEnd="url(#flow-arrow)" />
}

/** 连线上的文字（白描边，压住网格） */
function Lbl({ x, y, text, center = false }: { x: number; y: number; text: string; center?: boolean }) {
  return (
    <text x={x} y={y} fontSize={11} fill="#595959" className="flow__lbl" textAnchor={center ? 'middle' : 'start'}>
      {text}
    </text>
  )
}

/** 浏览器泳道里的小项 */
function Lane({ x, y, w, text, hot = false }: { x: number; y: number; w: number; text: string; hot?: boolean }) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={40}
        rx={6}
        fill={hot ? '#e6f4ff' : '#fff7e6'}
        stroke={hot ? '#91caff' : '#ffd591'}
        strokeWidth={1.2}
      />
      <text
        x={x + w / 2}
        y={y + 25}
        textAnchor="middle"
        fontSize={12}
        fontWeight={600}
        fill={hot ? '#0958d9' : '#d46b08'}
      >
        {text}
      </text>
    </g>
  )
}

/** 五个阶段的大白话说明 */
const PHASES = [
  {
    no: '①',
    name: '发生更新，先写一张「单子」',
    plain: '你点了一下按钮（或者 setState、接口回来了），React 先把这次改动写成一张「单子」，再给单子贴上优先级标签。',
    terms: ['createUpdate', 'lane 优先级'],
    tip: '这一步是同步的，只花几微秒，几乎不可能成为瓶颈 —— 别在这儿瞎优化。',
  },
  {
    no: '②',
    name: '排队，等浏览器喘口气',
    plain: '把活儿交给调度器排队。它用 MessageChannel 约一个空档来干活，绝不霸占主线程。',
    terms: ['Scheduler', 'taskQueue', '小顶堆排序'],
    tip: '这就是 React 看起来「慢半拍」的原因：它在等浏览器先处理完用户输入。',
  },
  {
    no: '③',
    name: '一格一格地算（可中断）',
    plain: '先建一棵草稿树试算，一个节点一个节点地处理；每算完一小段就问一句「这一帧还有时间吗？」',
    terms: ['workLoop', 'beginWork ↓ completeWork ↑', 'shouldYield()'],
    tip: '时间用完就保存进度、让出主线程；中途来了更急的活（比如用户打字），草稿可以直接扔掉重做 —— 这就是并发渲染。',
  },
  {
    no: '④',
    name: '一口气提交（不可中断）',
    plain: '草稿算完，真正去改 DOM 的三件小事必须连续做完，中间谁也不能插队。',
    terms: ['before mutation', 'mutation', 'layout'],
    tip: '这一步最贵、也最不能省。所以要尽量减少「需要提交的差异」—— memo、减少重渲染的意义正在这里。',
  },
  {
    no: '⑤',
    name: '画到屏幕上，再跑副作用',
    plain: '浏览器把画面画出来，然后才轮到 useEffect 执行。',
    terms: ['paint', 'useEffect'],
    tip: 'useLayoutEffect 卡在绘制之前（会阻塞上屏），useEffect 在绘制之后（不阻塞）—— 第 07 章有现场对比。',
  },
]

export function FiberTreeDiagram() {
  return (
    <div className="flow">
      <Alert
        className="flow__intro"
        type="info"
        showIcon
        message="一句话版本"
        description={
          <>
            一次 setState 之后：<b>打包改动</b> → <b>排队等空闲</b> → <b>一格一格地算</b>（可以中途暂停、甚至重来）→{' '}
            <b>一口气写进 DOM</b>（不能暂停）→ <b>浏览器画出来</b>。Vue 是「一口气跑完」，React 是「随时能按暂停键」，
            差别全在中间那两步。
          </>
        }
      />

      <div className="flow__canvas">
        <svg viewBox="0 0 1032 676" role="img" aria-label="React 一次更新的完整流程图">
          <defs>
            <marker
              id="flow-arrow"
              viewBox="0 0 10 10"
              refX={9}
              refY={5}
              markerWidth={7}
              markerHeight={7}
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="#8c8c8c" />
            </marker>
          </defs>

          {/* ================= 第一行：发生更新 → 排队 ================= */}
          <Box x={24} y={46} w={132} h={64} title="① 发生更新" sub="点按钮 / setState" />
          <Box x={186} y={46} w={156} h={64} title="② 写一张『改动单』" sub="createUpdate + lane" />
          <Box x={372} y={46} w={164} h={64} title="③ 排进调度队列" sub="Scheduler 按优先级排" />

          {/* ================= 第二行：渲染循环（可中断） ================= */}
          <rect
            x={16}
            y={158}
            width={1000}
            height={126}
            rx={10}
            fill="#fafcff"
            stroke="#91caff"
            strokeWidth={1}
            strokeDasharray="5 4"
          />
          <text x={20} y={151} fontSize={11.5} fontWeight={600} fill="#0958d9">
            渲染阶段：可以暂停、可以中途扔掉重做
          </text>

          <Box x={32} y={180} w={150} h={72} title="④ 先建一棵草稿树" sub="workInProgress 双缓冲" />
          <Box x={210} y={180} w={176} h={72} title="⑤ 一格一格地算" sub="beginWork ↓ completeWork ↑" />
          <Diamond cx={486} cy={216} hw={84} hh={54} lines={['还有下一个', '节点要算吗？']} />
          <Diamond cx={692} cy={216} hw={94} hh={54} lines={['这一帧的 5ms', '用完了吗？']} tone="red" />
          <Box x={828} y={180} w={180} h={72} title="⑥ 存进度 · 让出主线程" sub="下一帧从断点接着算" tone="plain" />

          {/* ================= 第三行：提交（不可中断） ================= */}
          <rect x={16} y={318} width={320} height={114} rx={10} fill="#fffafa" stroke="#ffa39e" strokeWidth={1} strokeDasharray="5 4" />
          <text x={20} y={311} fontSize={11.5} fontWeight={600} fill="#cf1322">
            提交阶段：不可暂停，一口气做完
          </text>
          <rect x={24} y={330} width={300} height={90} rx={8} fill="#fff2f0" stroke="#ffa39e" strokeWidth={1.2} />
          <text x={174} y={353} textAnchor="middle" fontSize={12.5} fontWeight={600} fill="#cf1322">
            ⑦ 一次性提交，真正改 DOM
          </text>
          <rect x={40} y={366} width={84} height={28} rx={6} fill="#fff" stroke="#ffccc7" />
          <text x={82} y={384} textAnchor="middle" fontSize={10.5} fontWeight={600} fill="#cf1322">
            ① 拍照
          </text>
          <rect x={132} y={366} width={84} height={28} rx={6} fill="#fff" stroke="#ffccc7" />
          <text x={174} y={384} textAnchor="middle" fontSize={10.5} fontWeight={600} fill="#cf1322">
            ② 改 DOM
          </text>
          <rect x={224} y={366} width={84} height={28} rx={6} fill="#fff" stroke="#ffccc7" />
          <text x={266} y={384} textAnchor="middle" fontSize={10.5} fontWeight={600} fill="#cf1322">
            ③ 跑 layout
          </text>
          <text x={174} y={410} textAnchor="middle" fontSize={9} fill="rgba(0,0,0,.45)">
            getSnapshotBeforeUpdate / mutation / useLayoutEffect
          </text>

          <Box x={364} y={339} w={170} h={72} title="⑧ 浏览器绘制上屏" sub="paint" tone="plain" />
          <Box x={574} y={339} w={190} h={72} title="⑨ 最后执行 useEffect" sub="绘制之后 · 异步" tone="plain" />

          {/* ================= 第四行：浏览器泳道 ================= */}
          <rect x={16} y={510} width={1000} height={142} rx={10} fill="#fafafa" stroke="#d9d9d9" strokeWidth={1.2} strokeDasharray="6 4" />
          <text x={34} y={536} fontSize={12} fontWeight={600} fill="#595959">
            浏览器主线程 —— 你的代码、浏览器自己的活，全在这条线上排队
          </text>
          <Lane x={36} y={548} w={470} text="事件处理（点击、输入、滚动）" />
          <Lane x={522} y={548} w={470} text="JS 执行" />
          <Lane x={36} y={600} w={470} text="布局与绘制（重排、重绘）" />
          <Lane x={522} y={600} w={470} text="空闲时间 → 这就是时间片的来源" hot />

          {/* ================= 箭头 ================= */}
          <Arrow d="M156,78 H182" />
          <Arrow d="M342,78 H368" />
          {/* 排队完，轮到它算 */}
          <Arrow d="M454,110 V138 H107 V176" />
          <Arrow d="M182,216 H206" />
          <Arrow d="M386,216 H398" />
          <Arrow d="M570,216 H594" />
          <Arrow d="M786,216 H824" />
          {/* 还有时间 → 回到「一格一格地算」 */}
          <Arrow d="M692,162 V124 H298 V176" />
          {/* 全算完了 → 进入提交 */}
          <Arrow d="M486,270 V306 H174 V326" />
          {/* 让出主线程 → 浏览器泳道 */}
          <Arrow d="M918,252 V506" />
          {/* 浏览器空闲 → 回到草稿树接着算 */}
          <Arrow d="M8,510 V216 H28" />
          <Arrow d="M324,375 H360" />
          <Arrow d="M534,375 H570" />

          {/* ================= 连线文字 ================= */}
          <Lbl x={300} y={132} text="轮到它算了" />
          <Lbl x={495} y={118} text="这一帧还有时间 → 接着算下一个节点" center />
          <Lbl x={580} y={208} text="有" />
          <Lbl x={801} y={208} text="用完了" />
          <Lbl x={330} y={300} text="全算完了 → 去提交" />
          <Lbl x={928} y={392} text="5ms 用完，先让位" />
          <Lbl x={34} y={498} text="浏览器空闲了 → 回来从断点继续" />
        </svg>
      </div>

      <div className="flow__phases">
        <div className="flow__phases-title">逐步展开：每个阶段到底在做什么（先说人话，术语只是备注）</div>
        <Row gutter={[12, 12]}>
          {PHASES.map((phase) => (
            <Col xs={24} md={12} xl={8} key={phase.no}>
              <Card
                size="small"
                className="flow__card"
                title={
                  <span className="flow__card-title">
                    <span className="flow__card-no">{phase.no}</span>
                    {phase.name}
                  </span>
                }
              >
                <p className="flow__card-plain">{phase.plain}</p>
                <div className="flow__card-terms">
                  {phase.terms.map((term) => (
                    <Tag key={term} color="blue" variant="filled">
                      {term}
                    </Tag>
                  ))}
                </div>
                <p className="flow__card-tip">
                  <b>要点：</b>
                  {phase.tip}
                </p>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      <Alert
        className="flow__outro"
        type="warning"
        showIcon
        message="所以优化的重点在哪？"
        description={
          <>
            红色那段（提交）不能暂停也省不掉，蓝色那段（计算）可以暂停但工作量还在。真正的省法只有一个：
            <b>让需要计算和提交的节点变少</b> —— memo、状态下沉、虚拟化、缓存，全都是干这一件事。
          </>
        }
      />
    </div>
  )
}
