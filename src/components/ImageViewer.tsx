import { X } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

type ImageViewerProps = {
  src: string | null
  alt?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImageViewer({ src, alt = 'Imagen', open, onOpenChange }: ImageViewerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[96vw] border-white/10 bg-moto-darker p-0 text-white sm:max-w-5xl">
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <button
          type="button"
          className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
          onClick={() => onOpenChange(false)}
          aria-label="Cerrar imagen"
        >
          <X className="h-5 w-5" />
        </button>
        {src && (
          <div className="grid max-h-[90vh] min-h-64 place-items-center overflow-auto rounded-lg bg-black/40 p-3">
            <img src={src} alt={alt} className="max-h-[86vh] max-w-full object-contain" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

