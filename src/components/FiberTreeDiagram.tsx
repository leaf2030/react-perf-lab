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

export function FiberTreeDiagram() {
  return (
    <div className="flow">
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
    </div>
  )
}
