type MotoHubXLogoProps = {
  compact?: boolean
  className?: string
}

export function MotoHubXLogo({ compact = false, className = '' }: MotoHubXLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-xl border border-white/10 bg-moto-darker shadow-lg shadow-moto-orange/20">
        <img src="/brand/motohubx-official-emblem.png" alt="" className="h-full w-full object-cover" />
      </div>
      {!compact && (
        <span className="text-xl font-bold tracking-tight text-white">
          Moto<span className="text-moto-orange">HubX</span>
        </span>
      )}
    </div>
  )
}
