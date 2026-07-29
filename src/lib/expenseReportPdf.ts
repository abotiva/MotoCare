export type ExpenseReportItem = {
  date: string
  description: string
  category: string
  amount: number
  detail?: string
}

export type ExpenseReportSection = {
  title: string
  items: ExpenseReportItem[]
}

type ExpenseReportPdfInput = {
  ownerName: string
  motorcycleName: string
  generatedAt: string
  sections: ExpenseReportSection[]
}

const money = (value: number) => `$ ${Math.round(value).toLocaleString('es-CO')} COP`

function ascii(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '-')
}

function escapePdf(value: string) {
  return ascii(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function wrap(value: string, maxLength = 92) {
  const words = ascii(value).split(/\s+/)
  const lines: string[] = []
  let current = ''
  words.forEach((word) => {
    if (`${current} ${word}`.trim().length > maxLength && current) {
      lines.push(current)
      current = word
    } else {
      current = `${current} ${word}`.trim()
    }
  })
  if (current) lines.push(current)
  return lines
}

export function downloadExpenseReportPdf(input: ExpenseReportPdfInput) {
  const pageLines: string[][] = [[]]
  const pushLine = (line = '') => {
    if (pageLines.at(-1)!.length >= 47) pageLines.push([])
    pageLines.at(-1)!.push(line)
  }

  pushLine('MOTOCARE CO - INFORME DETALLADO DE GASTOS')
  pushLine(`Usuario: ${input.ownerName}`)
  pushLine(`Moto: ${input.motorcycleName}`)
  pushLine(`Generado: ${input.generatedAt}`)
  pushLine('')

  input.sections.forEach((section) => {
    const total = section.items.reduce((sum, item) => sum + item.amount, 0)
    pushLine(`${section.title.toUpperCase()} - ${money(total)}`)
    pushLine('Fecha       Categoria                 Valor               Detalle')
    pushLine('--------------------------------------------------------------------------')
    if (section.items.length === 0) {
      pushLine('Sin gastos registrados.')
    } else {
      section.items.forEach((item) => {
        const prefix = `${item.date.padEnd(12)}${ascii(item.category).slice(0, 24).padEnd(26)}${money(item.amount).padEnd(20)}`
        const details = wrap(`${item.description}${item.detail ? ` - ${item.detail}` : ''}`, 70)
        pushLine(`${prefix}${details[0] ?? ''}`)
        details.slice(1).forEach((line) => pushLine(`${''.padEnd(58)}${line}`))
      })
    }
    pushLine('')
  })

  const grandTotal = input.sections.flatMap((section) => section.items).reduce((sum, item) => sum + item.amount, 0)
  pushLine(`TOTAL GENERAL: ${money(grandTotal)}`)

  const objects: string[] = []
  const addObject = (body: string) => {
    objects.push(body)
    return objects.length
  }
  const catalogId = addObject('')
  const pagesId = addObject('')
  const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  const pageIds: number[] = []

  pageLines.forEach((lines, pageIndex) => {
    const commands = [
      'BT',
      '/F1 10 Tf',
      '45 800 Td',
      ...lines.flatMap((line, lineIndex) => [
        lineIndex === 0 ? '' : '0 -16 Td',
        `(${escapePdf(line)}) Tj`,
      ]).filter(Boolean),
      'ET',
    ].join('\n')
    const contentId = addObject(`<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`)
    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`)
    pageIds.push(pageId)
    void pageIndex
  })

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((body, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`
  })
  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n` })
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  const blob = new Blob([pdf], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `motocare-informe-gastos-${new Date().toISOString().slice(0, 10)}.pdf`
  anchor.click()
  URL.revokeObjectURL(url)
}
