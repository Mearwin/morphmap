import { useEffect, useState, type RefObject } from 'react'

export function useContainerSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new ResizeObserver(entries => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      setSize(prev =>
        prev.width === width && prev.height === height
          ? prev
          : { width, height }
      )
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])

  return size
}
