import type { ReactNode } from 'react'
import { CodeBlock } from './CodeBlock'

type Props = {
  title: string
  tag?: string
  /** 一句话说明这个 demo 要证明什么 */
  desc?: ReactNode
  /** 讲解要点，现场照着说就行 */
  points?: string[]
  code?: string
  codeTone?: 'default' | 'good' | 'bad'
  tone?: 'default' | 'bad' | 'good'
  children?: ReactNode
}

export function DemoCard({
  title,
  tag,
  desc,
  points,
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
      {points && points.length > 0 ? (
        <div className="demo__points">
          <span className="demo__points-title">🎤 讲解要点</span>
          <ul>
            {points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {code ? <CodeBlock code={code} tone={codeTone} title="示例代码" /> : null}
    </section>
  )
}
