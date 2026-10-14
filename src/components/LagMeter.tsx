import { useEffect, useRef, useState } from 'react'

/**
 * 主线程卡顿计（LagMeter）
 *
 * 小白看不懂"卡不卡"，但看得懂"数字"。
 * 这个组件用 requestAnimationFrame 持续测量「两帧之间的真实间隔」：
 *  - 正常情况下一帧 ≈ 16.7ms（60fps）
 *  - 主线程被同步渲染占满时，帧间隔会飙到几百毫秒
 *
 * 它把"卡顿"翻译成一个会跳动的数字 + 一根会变红的进度条，
 * 让"冻结了 400ms"这件事变成肉眼可见的证据。
 */
export function LagMeter({
  running,
  label = '主线程卡顿',
  onSample,
}: {
  /** 是否正在测量 */
  running: boolean
  label?: string
  /** 每次采到新样本时回调（用于记录峰值） */
  onSample?: (lagMs: number) => void
}) {
  const [lag, setLag] = useState(0)
  const [peak, setPeak] = useState(0)
  const rafRef = useRef<number | null>(null)
  const lastRef = useRef(0)
  const peakRef = useRef(0)

  useEffect(() => {
    if (!running) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      return
    }

    lastRef.current = performance.now()
    peakRef.current = 0
    setPeak(0)

    function tick(now: number) {
      const delta = now - lastRef.current
      lastRef.current = now
      // 只统计"明显掉帧"的样本，避免 16.7ms 的正常抖动刷屏
      if (delta > 24) {
        setLag(delta)
        if (delta > peakRef.current) {
          peakRef.current = delta
          setPeak(delta)
        }
        onSample?.(delta)
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [running, onSample])

  const pct = Math.min(100, (lag / 500) * 100)
  const level = lag > 200 ? 'bad' : lag > 60 ? 'warn' : 'good'

  return (
    <div className={`lagmeter lagmeter--${level}`}>
      <div className="lagmeter__head">
        <span className="lagmeter__label">{label}</span>
        <span className="lagmeter__value">
          {lag > 0 ? `${lag.toFixed(0)} ms` : '—'}
        </span>
      </div>
      <div className="lagmeter__track">
        <div className="lagmeter__fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="lagmeter__foot">
        <span>峰值 {peak > 0 ? `${peak.toFixed(0)} ms` : '—'}</span>
        <span className="lagmeter__scale">一帧 16.7ms 是正常 · 超过 100ms 就是肉眼可见的卡</span>
      </div>
    </div>
  )
}
