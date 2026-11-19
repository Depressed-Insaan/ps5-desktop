import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/Icons'
import './Shelf.css'

interface ShelfProps {
  title: string
  count?: number
  emptyMessage?: string
  children: ReactNode
}

export function Shelf({ title, count, emptyMessage, children }: ShelfProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: true, end: true })

  const measure = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    setEdges({
      start: el.scrollLeft <= 2,
      end: el.scrollLeft >= el.scrollWidth - el.clientWidth - 2,
    })
  }, [])

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    measure()
    addEventListener('resize', measure)
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => {
      removeEventListener('resize', measure)
      observer.disconnect()
    }
  }, [measure])

  useEffect(() => {
    const el = trackRef.current
    if (!el) return

    // A vertical mouse wheel moves the row sideways, like a console shelf.
    function onWheel(event: WheelEvent) {
      if (!el) return
      if (el.scrollWidth <= el.clientWidth) return
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
      event.preventDefault()
      el.scrollLeft += event.deltaY
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  function step(direction: -1 | 1) {
    const el = trackRef.current
    if (!el) return
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' })
  }

  const scrollable = !(edges.start && edges.end)
  const isEmpty = count === 0

  return (
    <section className="shelf">
      <header className="shelf__head">
        <h2 className="shelf__title">{title}</h2>
        {scrollable ? (
          <div className="shelf__arrows">
            <button
              type="button"
              className="shelf__arrow"
              aria-label={`Scroll ${title} left`}
              disabled={edges.start}
              onClick={() => step(-1)}
            >
              <ChevronLeftIcon size={16} />
            </button>
            <button
              type="button"
              className="shelf__arrow"
              aria-label={`Scroll ${title} right`}
              disabled={edges.end}
              onClick={() => step(1)}
            >
              <ChevronRightIcon size={16} />
            </button>
          </div>
        ) : null}
      </header>

      {isEmpty ? (
        <p className="shelf__empty">{emptyMessage}</p>
      ) : (
        <div
          ref={trackRef}
          data-nav-row
          onScroll={measure}
          className={[
            'shelf__track',
            edges.start ? '' : 'is-faded-start',
            edges.end ? '' : 'is-faded-end',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {children}
        </div>
      )}
    </section>
  )
}
