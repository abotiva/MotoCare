type MotoCareLogoProps = {
  compact?: boolean
  className?: string
}

export function MotoCareLogo({ compact = false, className = '' }: MotoCareLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-moto-darker shadow-lg shadow-moto-orange/20">
        <div className="absolute inset-1 rounded-lg border-2 border-moto-orange" />
        <span className="relative text-xl font-black leading-none text-white">M</span>
        <span className="absolute bottom-1 h-2 w-5 rounded-b-md border-b-2 border-x-2 border-white" />
      </div>
      {!compact && (
        <span className="text-xl font-bold tracking-tight text-white">
          Moto<span className="text-moto-orange">Care</span> Co
        </span>
      )}
    </div>
  )
}
