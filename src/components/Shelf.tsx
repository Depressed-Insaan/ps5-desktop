import type { ReactNode } from 'react'
import './Shelf.css'

interface ShelfProps {
  title: string
  subtitle?: string
  children: ReactNode
}

export function Shelf({ title, subtitle, children }: ShelfProps) {
  return (
    <section className="shelf">
      <header className="shelf__head">
        <h2 className="shelf__title">{title}</h2>
        {subtitle ? <span className="shelf__sub">{subtitle}</span> : null}
      </header>
      <div className="shelf__track">{children}</div>
    </section>
  )
}
