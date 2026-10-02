import { useState } from 'react'

type Props = {
  code: string
  title?: string
  /** 代码块的语气：good 显示绿色边框，bad 显示红色边框 */
  tone?: 'default' | 'good' | 'bad'
}

export function CodeBlock({ code, title, tone = 'default' }: Props) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className={`code code--${tone}`}>
      <div className="code__head">
        <span className="code__title">{title ?? '代码'}</span>
        <button type="button" className="code__copy" onClick={copy}>
          {copied ? '已复制 ✓' : '复制'}
        </button>
      </div>
      <pre className="code__pre">
        <code>{code.trim()}</code>
      </pre>
    </div>
  )
}
