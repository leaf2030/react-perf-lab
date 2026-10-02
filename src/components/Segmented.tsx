type Option<T extends string> = { value: T; label: string }

type Props<T extends string> = {
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
  ariaLabel?: string
}

/** 分段控件，用来在「优化前 / 优化后」之间切换 */
export function Segmented<T extends string>({ value, options, onChange, ariaLabel }: Props<T>) {
  return (
    <div className="segmented" role="tablist" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          className={option.value === value ? 'segmented__btn is-active' : 'segmented__btn'}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
