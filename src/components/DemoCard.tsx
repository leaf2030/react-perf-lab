import type { ReactNode } from 'react'
import { CodeBlock } from './CodeBlock'

type Props = {
  title: string
  tag?: string
  /** 一句话说明这个 demo 要证明什么 */
  desc?: ReactNode
  code?: string
  codeTone?: 'default' | 'good' | 'bad'
  tone?: 'default' | 'bad' | 'good'
  children?: ReactNode
}

export function DemoCard({
  title,
  tag,
  desc,
  code,
  codeTone = 'default',
  tone = 'default',
  children,
}: Props) {
  return (
    <section className={`demo demo--${tone}`}>
      <header className="demo__head">
        <h3 className="demo__title">{title}</h3>
        {tag ? <span className="tag">{tag}</span> : null}
      </header>
      {desc ? <p className="demo__desc">{desc}</p> : null}
      {children ? <div className="demo__body">{children}</div> : null}
      {code ? <CodeBlock code={code} tone={codeTone} title="示例代码" /> : null}
    </section>
  )
}
