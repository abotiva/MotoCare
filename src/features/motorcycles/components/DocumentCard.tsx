import { ExternalLink, FileText, Loader2, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { dateStatus } from '@/features/motorcycles/utils/dateStatus'
import type { MotorcycleDocument } from '@/types/database'

type DocumentCardProps = {
  title: string
  expiresOn: string | null
  documentType: MotorcycleDocument['document_type']
  document?: MotorcycleDocument
  canUpload: boolean
  isUploading: boolean
  uploadsDisabled: boolean
  onUpload: (file: File, type: MotorcycleDocument['document_type']) => void
  onOpen: (document: MotorcycleDocument) => void
  onDelete: (document: MotorcycleDocument) => void
}

export function DocumentCard({
  title,
  expiresOn,
  documentType,
  document,
  canUpload,
  isUploading,
  uploadsDisabled,
  onUpload,
  onOpen,
  onDelete,
}: DocumentCardProps) {
  const status = dateStatus(expiresOn)
  return (
    <Card className="border-white/5 bg-moto-darker p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-moto-orange/20">
          <FileText className="h-6 w-6 text-moto-orange" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-medium">{title}</h3>
          <p className={`text-sm ${status.tone}`}>{status.label}</p>
          {document && <p className="mt-1 truncate text-xs text-gray-500">{document.file_name}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {canUpload && (
              <label className="inline-flex min-h-9 cursor-pointer items-center rounded-md border border-white/10 px-3 py-2 text-xs transition-colors hover:bg-white/5">
                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {document ? 'Reemplazar' : 'Subir'}
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  disabled={uploadsDisabled}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) onUpload(file, documentType)
                    event.target.value = ''
                  }}
                />
              </label>
            )}
            {document && (
              <>
                <Button size="sm" variant="outline" className="border-white/10 text-xs" onClick={() => onOpen(document)}>
                  <ExternalLink className="mr-2 h-4 w-4" />Abrir
                </Button>
                <Button size="sm" variant="outline" className="border-white/10 text-xs" onClick={() => onDelete(document)}>
                  <Trash2 className="mr-2 h-4 w-4" />Eliminar
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
