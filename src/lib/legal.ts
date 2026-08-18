export type LegalDocumentType = 'terms' | 'privacy'

export type LegalDocumentDefinition = {
  type: LegalDocumentType
  title: string
  version: string
  status: 'draft' | 'published'
  updatedAt: string
  path: string
}

export const LEGAL_DOCUMENTS: Record<LegalDocumentType, LegalDocumentDefinition> = {
  terms: {
    type: 'terms',
    title: 'Términos y Condiciones',
    version: '0.1-borrador',
    status: 'draft',
    updatedAt: '2026-08-05',
    path: '/legal/terminos',
  },
  privacy: {
    type: 'privacy',
    title: 'Política de Privacidad',
    version: '0.1-borrador',
    status: 'draft',
    updatedAt: '2026-08-05',
    path: '/legal/privacidad',
  },
}

export type SignupLegalConsent = {
  termsAccepted: true
  privacyAccepted: true
  termsVersion: string
  privacyVersion: string
}

