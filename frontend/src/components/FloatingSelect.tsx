import React, { useState, useRef, useLayoutEffect, useCallback, useMemo } from 'react'

export type Option = { value: string; label: string }

type FloatingSelectProps = {
  id: string
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  options: Option[]
  floatingLabel?: boolean
  disabled?: boolean
  alwaysFloat?: boolean
}

export default function FloatingSelect({
  id,
  label,
  value,
  onChange,
  options,
  floatingLabel = true,
  disabled = false,
  alwaysFloat = false
}: FloatingSelectProps) {
  const [focused, setFocused] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const labelRef = useRef<HTMLLabelElement | null>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [gap, setGap] = useState<{ left: number; width: number; ready: boolean }>({ left: 0, width: 0, ready: false })

  const hasValue = value !== ''
  const shouldFloat = floatingLabel !== false && (focused || hasValue || alwaysFloat)

  const scale = 0.75
  const gapPadding = 10
  const radius = 4

  const measureBox = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const w = el.offsetWidth
    const h = el.offsetHeight
    if (w && h) setBox(p => (p.w !== w || p.h !== h ? { w, h } : p))
  }, [])

  useLayoutEffect(() => {
    measureBox()
    const el = containerRef.current
    if (!el) return
    let ro: ResizeObserver | undefined
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measureBox)
      ro.observe(el)
    } else {
      window.addEventListener('resize', measureBox)
    }
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', measureBox)
    }
  }, [measureBox])

  useLayoutEffect(() => {
    if (!shouldFloat || !labelRef.current || !containerRef.current) return
    const containerRect = containerRef.current.getBoundingClientRect()
    const labelEl = labelRef.current
    const left = labelEl.getBoundingClientRect().left - containerRect.left
    const width = Math.round(labelEl.offsetWidth * scale)
    setGap(g => (g.left !== left || g.width !== width || !g.ready ? { left, width, ready: true } : g))
  }, [shouldFloat, label, scale])

  const buildBaseSegments = useCallback((w: number, h: number, r: number) => {
    return [
      `M ${r} 0`,
      `H ${w - r}`,
      `A ${r} ${r} 0 0 1 ${w} ${r}`,
      `V ${h - r}`,
      `A ${r} ${r} 0 0 1 ${w - r} ${h}`,
      `H ${r}`,
      `A ${r} ${r} 0 0 1 0 ${h - r}`,
      `V ${r}`,
      `A ${r} ${r} 0 0 1 ${r} 0`
    ]
  }, [])

  const outlinePath = useMemo(() => {
    const { w, h } = box
    if (!w || !h) return ''
    const r = radius
    const base = buildBaseSegments(w, h, r)
    if (!shouldFloat || !gap.ready) return base.join(' ')
    const rawLeft = gap.left - gapPadding
    const rawRight = rawLeft + gap.width + gapPadding * 2
    const left = Math.max(r + 2, rawLeft)
    const right = Math.min(w - r - 2, rawRight)
    return [`M ${r} 0`, `H ${left}`, `M ${right} 0`, `H ${w - r}`, ...base.slice(2)].join(' ')
  }, [box, shouldFloat, gap, gapPadding, radius, buildBaseSegments])

  const strokeColor = focused ? '#2e6169' : disabled ? '#d1d5db' : '#797979'

  return (
    <div ref={containerRef} className="relative w-full" style={{ minHeight: '20px' }}>
      <svg aria-hidden className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" style={{ zIndex: 1 }}>
        <path d={outlinePath} style={{ stroke: strokeColor, fill: 'none', strokeWidth: 1, vectorEffect: 'non-scaling-stroke', transition: 'stroke 0.2s ease' }} />
      </svg>

      <div className="relative" style={{ zIndex: 2 }}>
        <select
          id={id}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          className="w-full bg-transparent border-0 outline-none px-3 py-3.5 text-base"
          style={{ paddingTop: '10px', paddingBottom: '6px', boxShadow: '0 0 0 1000px transparent inset', WebkitBoxShadow: '0 0 0 1000px transparent inset', WebkitTextFillColor: 'inherit' }}
        >
          <option value="">(select)</option>
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {floatingLabel !== false && (
          <label
            ref={labelRef}
            htmlFor={id}
            className={`absolute left-3 px-1 pointer-events-none transition-all duration-200 ease-out origin-top-left ${shouldFloat ? 'top-3 -translate-y-1/2 text-md' : 'top-8 -translate-y-1/2 text-base text-gray-500'}`}
            style={{ transform: shouldFloat ? `translateY(-50%) scale(${scale})` : 'translateY(-50%) scale(1)', color: focused && shouldFloat ? '#2e6169' : shouldFloat ? undefined : undefined }}
          >
            {label}
          </label>
        )}
      </div>
    </div>
  )
}
