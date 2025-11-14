import { useEffect, useRef, memo } from 'react'

type Props = {
  value: string
  onChange: (html: string) => void
  readOnly?: boolean
}

function SimpleEditor({ value, onChange, readOnly }: Props) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!ref.current) return
    if (ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || ''
    }
  }, [value])

  const exec = (cmd: string, val?: string) => {
    if (readOnly) return
    document.execCommand(cmd, false, val)
    if (ref.current) onChange(ref.current.innerHTML)
  }

  return (
    <div className="border rounded-md">
      {!readOnly && (
        <div className="flex gap-2 p-2 border-b text-sm">
          <button type="button" className="px-2 py-1 border rounded" onClick={() => exec('bold')}>B</button>
          <button type="button" className="px-2 py-1 border rounded italic" onClick={() => exec('italic')}>I</button>
          <button type="button" className="px-2 py-1 border rounded underline" onClick={() => exec('underline')}>U</button>
          <button type="button" className="px-2 py-1 border rounded" onClick={() => exec('formatBlock', '<h3>')}>H3</button>
          <button type="button" className="px-2 py-1 border rounded" onClick={() => exec('insertUnorderedList')}>• List</button>
          <button type="button" className="px-2 py-1 border rounded" onClick={() => {
            const url = prompt('Enter URL') || ''
            if (!url) return
            exec('createLink', url)
          }}>Link</button>
        </div>
      )}
      <div
        ref={ref}
        className="p-3 min-h-40 prose max-w-none"
        contentEditable={!readOnly}
        suppressContentEditableWarning
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
      />
    </div>
  )
}

export default memo(SimpleEditor)
