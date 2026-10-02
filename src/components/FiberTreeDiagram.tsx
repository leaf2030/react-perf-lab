/* ============================================================
   FiberTreeDiagram —— 首页开场的「React 并发渲染」流程图

   借鉴经典调度流程图的画法：方框 = 步骤，菱形 = 判断，
   虚线框 = 浏览器环境，网格底 = 调度时间线。
   讲给 Vue 团队：Vue 的更新是同步一口气跑完；React 中间多了
   「时间片检查」和「让出主线程」两步。纯 SVG，不依赖图表库。
   ============================================================ */

type BoxLines = { text: string; size?: number; color?: string; bold?: boolean }[]

/** 蓝色流程框（正常步骤） */
function Box({ x, y, w, h, lines }: { x: number; y: number; w: number; h: number; lines: BoxLines }) {
  const cy = y + h / 2
  const start = cy - ((lines.length - 1) * 16) / 2
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill="#e6f4ff" stroke="#91caff" strokeWidth={1.2} />
      {lines.map((l, i) => (
        <text
          key={l.text}
          x={x + w / 2}
          y={start + i * 16 + 4}
          textAnchor="middle"
          fontSize={l.size ?? 13}
          fontWeight={l.bold === false ? 400 : 600}
          fill={l.color ?? '#0958d9'}
        >
          {l.text}
        </text>
      ))}
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
        <text key={t} x={cx} y={start + i * 16 + 4} textAnchor="middle" fontSize={12.5} fontWeight={600} fill={color}>
          {t}
        </text>
      ))}
    </g>
  )
}

/** 带箭头的路径 */
function Arrow({ d }: { d: string }) {
  return <path d={d} fill="none" stroke="#8c8c8c" strokeWidth={1.3} markerEnd="url(#flow-arrow)" />
}

/** 箭头旁的文字标签（白描边，保证在网格上可读） */
function Lbl({ x, y, text, center = false }: { x: number; y: number; text: string; center?: boolean }) {
  return (
    <text x={x} y={y} fontSize={11.5} fill="#595959" className="flow__lbl" textAnchor={center ? 'middle' : 'start'}>
      {text}
    </text>
  )
}

/** 浏览器虚线框里的堆叠小项 */
function EnvItem({ x, y, w, text, hot = false }: { x: number; y: number; w: number; text: string; hot?: boolean }) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={30}
        rx={6}
        fill={hot ? '#e6f4ff' : '#fff7e6'}
        stroke={hot ? '#91caff' : '#ffd591'}
        strokeWidth={1.2}
      />
      <text
        x={x + w / 2}
        y={y + 19}
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
        <svg viewBox="0 0 1032 516" role="img" aria-label="React 并发渲染流程图：一次 setState 之后发生了什么">
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

          {/* ---------- 第一行：主流程 ---------- */}
          <Box
            x={20}
            y={78}
            w={104}
            h={44}
            lines={[
              { text: 'React' },
              { text: 'setState 更新', size: 10.5, color: 'rgba(0,0,0,.65)', bold: false },
            ]}
          />
          <Box
            x={160}
            y={78}
            w={120}
            h={44}
            lines={[
              { text: '请求调度' },
              { text: 'Scheduler 入队', size: 10.5, color: 'rgba(0,0,0,.65)', bold: false },
            ]}
          />
          <Box
            x={318}
            y={78}
            w={104}
            h={44}
            lines={[
              { text: '执行任务' },
              { text: 'workLoop', size: 10.5, color: 'rgba(0,0,0,.65)', bold: false },
            ]}
          />
          <Diamond cx={530} cy={100} hw={86} hh={48} lines={['队列里还有', '任务单元吗？']} />
          <Box
            x={640}
            y={72}
            w={150}
            h={56}
            lines={[
              { text: '执行任务单元' },
              { text: 'beginWork / completeWork', size: 9.5, color: 'rgba(0,0,0,.65)', bold: false },
            ]}
          />
          <Diamond cx={920} cy={100} hw={96} hh={52} lines={['本帧时间片', '还剩吗？']} tone="red" />

          {/* ---------- 第二行：commit 分支 与 让出分支 ---------- */}
          <Box
            x={455}
            y={196}
            w={150}
            h={52}
            lines={[
              { text: 'commit 提交阶段', color: '#cf1322' },
              { text: '同步执行 · 不可中断', size: 10.5, color: '#cf1322', bold: false },
            ]}
          />
          <Box
            x={455}
            y={296}
            w={150}
            h={44}
            lines={[
              { text: '浏览器绘制渲染', color: 'rgba(0,0,0,.88)' },
              { text: 'paint', size: 10, color: 'rgba(0,0,0,.45)', bold: false },
            ]}
          />
          <Box
            x={845}
            y={196}
            w={150}
            h={52}
            lines={[
              { text: '让出主线程', color: '#d46b08' },
              { text: '可被高优先级插队', size: 10, color: 'rgba(0,0,0,.65)', bold: false },
            ]}
          />

          {/* ---------- 左下：浏览器环境（虚线框 + 堆叠项） ---------- */}
          <rect
            x={60}
            y={320}
            width={300}
            height={180}
            rx={10}
            fill="#fafafa"
            stroke="#d9d9d9"
            strokeWidth={1.2}
            strokeDasharray="6 4"
          />
          <text x={76} y={341} fontSize={12.5} fontWeight={600} fill="#595959">
            浏览器
          </text>
          <EnvItem x={95} y={352} w={230} text="事件处理" />
          <EnvItem x={95} y={390} w={230} text="JS 环境" />
          <EnvItem x={95} y={428} w={230} text="布局与绘制" />
          <EnvItem x={95} y={466} w={230} text="空闲时间 · 时间片来源" hot />

          {/* ---------- 箭头 ---------- */}
          {/* 主流程向右 */}
          <Arrow d="M124,100 H156" />
          <Arrow d="M280,100 H314" />
          <Arrow d="M422,100 H440" />
          <Arrow d="M616,100 H636" />
          <Arrow d="M790,100 H820" />
          {/* 红菱形「还有时间」：顶部大回环，回到执行任务单元 */}
          <Arrow d="M920,48 V20 H715 V68" />
          {/* 蓝菱形「没有了」→ commit */}
          <Arrow d="M530,148 V192" />
          {/* commit → 绘制 */}
          <Arrow d="M530,248 V292" />
          {/* 红菱形「用完了」→ 让出主线程 */}
          <Arrow d="M920,152 V192" />
          {/* 让出 → 浏览器环境 */}
          <Arrow d="M920,248 V410 H364" />
          {/* 浏览器空闲 → 回到调度 */}
          <Arrow d="M220,320 V126" />

          {/* ---------- 边上的标签 ---------- */}
          <Lbl x={618} y={92} text="有" />
          <Lbl x={818} y={14} text="还有时间，执行下一个单元" center />
          <Lbl x={542} y={174} text="没有了" />
          <Lbl x={932} y={176} text="用完了" />
          <Lbl x={642} y={404} text="主线程空闲，拿下一个时间片" center />
          <Lbl x={232} y={220} text="空闲时间片" />
        </svg>
      </div>

      <div className="flow__note">
        <b>跟 Vue 最大的不同：</b>
        Vue 的更新是同步一口气跑完；React 在中间多了「时间片检查」和「让出主线程」两步 ——
        useTransition / useDeferredValue 这些并发特性都发生在黄色区域里。但注意
        <b> commit 一旦开始就不可中断</b>
        ，所以优化的本质仍是减少要处理的节点，而不是指望并发替你兜底。
      </div>
    </div>
  )
}
