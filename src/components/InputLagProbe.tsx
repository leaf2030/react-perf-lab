import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 输入延迟计（InputLagProbe）
 *
 * 这是让小白"亲眼看见卡顿"的关键道具。
 *
 * 原理：在输入框的 onChange 里记录「用户敲下按键的时刻」，
 * 然后在 requestAnimationFrame 里记录「这一帧真正被绘制出来的时刻」。
 * 两者的差值 = 用户从按键到看见反馈之间等待的时间。
 *
 *  - 输入跟手：延迟 ≈ 16~30ms（一帧）
 *  - 主线程被慢渲染占满：延迟会飙到几百毫秒，数字直接变红
 *
 * 这个数字是"体感"的量化版本，比"你感觉卡不卡"有说服力得多。
 *
 * 用法（推荐）：把测量逻辑挂在输入框的 onChange 上
 *
 * ```tsx
 * const lag = useInputLag()
 * <input onChange={(e) => { lag.markKeystroke(); setKeyword(e.target.value) }} />
 * <InputLagProbe lag={lag} />
 * ```
 */
export type InputLagState = {
  /** 最近一次按键的延迟（ms），还没输入时为 null */
  lag: number | null
  /** 历史峰值（ms） */
  peak: number
  /** 最近 20 次采样 */
  samples: number[]
  /** 在 input 的 onChange 里调用：标记"用户刚刚敲了一下" */
  markKeystroke: () => void
  /** 清空所有采样 */
  reset: () => void
}

/** 把"按键 → 屏幕出现字符"的延迟测量抽成 hook，方便任意输入框复用 */
export function useInputLag(enabled = true): InputLagState {
  const [lag, setLag] = useState<number | null>(null)
  const [peak, setPeak] = useState(0)
  const [samples, setSamples] = useState<number[]>([])
  const pendingRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  /**
   * 在「用户敲下按键」的那一刻打点。
   *
   * ⚠️ 必须挂在 onKeyDown / onBeforeInput 上，**不能**挂在 onChange 上。
   * 原因：React 19 的 onChange 是事件委托 + 并发调度，慢渲染发生在 onChange
   * 返回之后。如果在 onChange 里打点，测到的只是"事件处理耗时"（几毫秒），
   * 而真正阻塞主线程的那 300ms 渲染完全测不到。
   *
   * 打点后我们用「双重 rAF」等待：第一帧是 React 提交 + 浏览器绘制，
   * 第二帧才说明上一帧真的画完了。这样测出来的才是用户真实的等待时间。
   */
  const markKeystroke = useCallback(() => {
    if (!enabled) return
    pendingRef.current = performance.now()

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      // 第一帧：React 已经提交，浏览器即将绘制。再等一帧确认绘制完成。
      rafRef.current = requestAnimationFrame(() => {
        if (pendingRef.current === null) return
        const delta = performance.now() - pendingRef.current
        pendingRef.current = null
        setLag(delta)
        setPeak((value) => Math.max(value, delta))
        setSamples((list) => [...list.slice(-19), delta])
      })
    })
  }, [enabled])

  const reset = useCallback(() => {
    setLag(null)
    setPeak(0)
    setSamples([])
  }, [])

  return { lag, peak, samples, markKeystroke, reset }
}

/** 纯展示组件：把 useInputLag 的结果画成数字 + 柱状图 */
export function InputLagProbe({ lag }: { lag: InputLagState }) {
  const { lag: current, peak, samples, reset } = lag
  const level = current === null ? 'idle' : current > 200 ? 'bad' : current > 60 ? 'warn' : 'good'
  const avg = samples.length > 0 ? samples.reduce((a, b) => a + b, 0) / samples.length : 0

  return (
    <div className={`inputlag inputlag--${level}`}>
      <div className="inputlag__head">
        <span className="inputlag__label">输入延迟（按键 → 屏幕出现字符）</span>
        <span className="inputlag__value">{current === null ? '还没输入' : `${current.toFixed(0)} ms`}</span>
      </div>

      <div className="inputlag__bars" aria-hidden="true">
        {samples.length === 0 ? (
          <span className="inputlag__empty">开始打字后，这里会出现每一次按键的延迟柱</span>
        ) : (
          samples.map((value, index) => (
            <span
              key={index}
              className={`inputlag__bar ${value > 200 ? 'is-bad' : value > 60 ? 'is-warn' : 'is-good'}`}
              style={{ height: `${Math.min(100, (value / 500) * 100)}%` }}
              title={`${value.toFixed(0)} ms`}
            />
          ))
        )}
      </div>

      <div className="inputlag__foot">
        <span>峰值 {peak > 0 ? `${peak.toFixed(0)} ms` : '—'}</span>
        <span>平均 {avg > 0 ? `${avg.toFixed(0)} ms` : '—'}</span>
        <button type="button" className="btn btn--ghost inputlag__reset" onClick={reset}>
          清零
        </button>
      </div>
    </div>
  )
}
