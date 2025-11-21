import { useState } from 'react'

type FloatingInputProps = {
  id: string
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  floatingLabel?: boolean // optional, defaults to true
  type?: string // optional, defaults to 'text'
}

export default function FloatingInput({
  id,
  label,
  value,
  onChange,
  floatingLabel = true,
  type = 'text'
}: FloatingInputProps) {
  const [focused, setFocused] = useState(false)
  const hasValue = value !== ''
  const shouldFloat = floatingLabel !== false && (focused || hasValue)

  return (
    <div className="relative">
      {floatingLabel !== false && (
        <label
          htmlFor={id}
          className={`
            absolute left-3 pointer-events-none
            transition-all duration-200 ease-out
            ${
              shouldFloat
                ? '-top-2.5 text-xs bg-white px-1 text-blue-600'
                : 'top-2.5 text-base text-gray-500'
            }
          `}
        >
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`
          w-full border rounded px-3 py-2.5
          outline-none transition-colors
          ${focused ? 'border-blue-600' : 'border-gray-300'}
          hover:border-gray-400
        `}
      />
    </div>
  )
}
