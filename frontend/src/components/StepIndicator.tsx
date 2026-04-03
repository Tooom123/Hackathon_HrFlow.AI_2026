const STEPS = ['Job', 'Questions', 'Share'] as const

interface Props {
  current: 1 | 2 | 3
}

export default function StepIndicator({ current }: Props) {
  return (
    <div className="flex items-center gap-3">
      {STEPS.map((label, i) => {
        const step = (i + 1) as 1 | 2 | 3
        const isActive = step === current
        const isDone = step < current
        return (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && <div className={`h-px w-6 transition-colors ${isDone ? 'bg-brand/40' : 'bg-zinc-700'}`} />}
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
              isActive
                ? 'bg-brand text-white'
                : isDone
                ? 'bg-brand/20 text-brand'
                : 'bg-zinc-800 text-zinc-500'
            }`}>{step}</span>
            <span className={`text-xs font-medium transition-colors ${
              isActive ? 'text-zinc-200' : isDone ? 'text-zinc-500' : 'text-zinc-600'
            }`}>
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
