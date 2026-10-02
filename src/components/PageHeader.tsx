import type { ReactNode } from 'react'

type Props = {
  index?: string
  title: string
  subtitle?: string
  tags?: string[]
  children?: ReactNode
}

export function PageHeader({ index, title, subtitle, tags, children }: Props) {
  return (
    <header className="page-head">
      <div className="page-head__row">
        {index ? <span className="page-head__index">{index}</span> : null}
        <h1 className="page-head__title">{title}</h1>
      </div>
      {subtitle ? <p className="page-head__subtitle">{subtitle}</p> : null}
      {tags && tags.length > 0 ? (
        <div className="page-head__tags">
          {tags.map((tag) => (
            <span className="tag tag--soft" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      ) : null}
      {children}
    </header>
  )
}

/** 页面里的一个普通小节 */
export function Panel({
  title,
  children,
  tone = 'default',
}: {
  title?: string
  children: ReactNode
  tone?: 'default' | 'good' | 'bad'
}) {
  return (
    <section className={`panel panel--${tone}`}>
      {title ? <h3 className="panel__title">{title}</h3> : null}
      {children}
    </section>
  )
}
