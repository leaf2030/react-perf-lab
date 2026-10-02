import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  /** 出错时自定义 UI；不传则使用默认的「加载失败 + 重试」样式 */
  fallback?: (error: Error, reset: () => void) => ReactNode
  /** 点击重试时的额外回调（通常用来换一个 key 让子树重新挂载） */
  onReset?: () => void
}

type State = { error: Error | null }

/**
 * 错误边界。
 *
 * 声明式代码里唯一还需要 class 的地方：React 至今没有函数式的错误边界。
 * 懒加载场景必备 —— chunk 加载失败（网络抖动、发版后旧 chunk 被删）时，
 * 用户看到的应该是「重试」按钮，而不是白屏。
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error.message, info.componentStack)
  }

  reset = () => {
    this.setState({ error: null })
    this.props.onReset?.()
  }

  render(): ReactNode {
    const { error } = this.state

    if (error) {
      if (this.props.fallback) {
        return this.props.fallback(error, this.reset)
      }
      return (
        <div className="panel panel--bad" style={{ marginBottom: 0 }}>
          <h4 className="panel__title">😵 组件加载失败</h4>
          <p className="hint">{error.message}</p>
          <button type="button" className="btn" onClick={this.reset}>
            重试
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
