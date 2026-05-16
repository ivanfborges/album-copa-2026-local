import { getFlagEmojiForSection } from '../data/flagEmojis'
import type { ReportRow, ReportSummary } from './reportData'

export type ReportExportFormat = 'csv' | 'pdf' | 'png' | 'mobilePng' | 'whatsappText'
export type WhatsappTextExportResult = 'copied' | 'downloaded'

type CompactReportGroup = {
  sectionCode: string
  sectionName: string
  group: string
  items: string[]
}

const fileDate = () => new Date().toISOString().slice(0, 10)

function safeFilePart(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function downloadBlob(content: BlobPart, type: string, filename: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function csvCell(value: string | number | boolean) {
  const text = String(value).replace(/"/g, '""')
  return `"${text}"`
}

function reportBaseName(summary: ReportSummary) {
  return `album-copa-2026-${safeFilePart(summary.filterLabel)}-${safeFilePart(summary.sectionLabel)}-${fileDate()}`
}

function formatGeneratedAt(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function compactCount(summary: ReportSummary) {
  if (summary.filterLabel === 'Repetidas') {
    return summary.repeatedTotal
  }

  if (summary.filterLabel === 'Faltantes') {
    return summary.missingRows
  }

  return summary.totalRows
}

function compactTitle(summary: ReportSummary) {
  return `Figurinhas ${summary.filterLabel}`.toUpperCase()
}

function stickerNumber(row: ReportRow) {
  return row.code.replace(new RegExp(`^${row.sectionCode}\\s*`, 'i'), '').trim() || row.code
}

function compactItemLabel(row: ReportRow, summary: ReportSummary) {
  const number = stickerNumber(row)

  if (summary.filterLabel === 'Repetidas' && row.quantity > 1) {
    return `${number} (x${row.quantity - 1})`
  }

  return number
}

export function buildCompactReportGroups(
  rows: readonly ReportRow[],
  summary: ReportSummary,
): CompactReportGroup[] {
  const groups = new Map<string, CompactReportGroup>()

  rows.forEach((row) => {
    const current =
      groups.get(row.sectionCode) ??
      ({
        sectionCode: row.sectionCode,
        sectionName: row.sectionName,
        group: row.group,
        items: [],
      } satisfies CompactReportGroup)

    current.items.push(compactItemLabel(row, summary))
    groups.set(row.sectionCode, current)
  })

  return [...groups.values()]
}

export function buildWhatsappReportText(rows: readonly ReportRow[], summary: ReportSummary) {
  const groups = buildCompactReportGroups(rows, summary)
  const lines = ['🏆 Copa 2026', `📦 ${compactTitle(summary)} (${compactCount(summary)})`, '']

  if (groups.length === 0) {
    lines.push('Nenhuma figurinha encontrada para esse filtro.')
    return lines.join('\n')
  }

  groups.forEach((group, index) => {
    const flag = getFlagEmojiForSection(group.sectionCode)
    const sectionLabel = flag ? `${flag} ${group.sectionCode}` : group.sectionCode

    lines.push(`${sectionLabel}: ${group.items.join(', ')}`)

    if (index < groups.length - 1) {
      lines.push('')
    }
  })

  return lines.join('\n')
}

function wrapCompactItems(
  context: CanvasRenderingContext2D,
  sectionCode: string,
  items: readonly string[],
  maxWidth: number,
) {
  const lines: string[] = []
  let current = `${sectionCode} `

  items.forEach((item) => {
    const candidate = current.endsWith(' ') ? `${current}${item}` : `${current}, ${item}`

    if (context.measureText(candidate).width <= maxWidth || current === `${sectionCode} `) {
      current = candidate
      return
    }

    lines.push(current)
    current = item
  })

  if (current.trim()) {
    lines.push(current)
  }

  return lines
}

function drawRoundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2)

  context.beginPath()
  context.moveTo(x + safeRadius, y)
  context.arcTo(x + width, y, x + width, y + height, safeRadius)
  context.arcTo(x + width, y + height, x, y + height, safeRadius)
  context.arcTo(x, y + height, x, y, safeRadius)
  context.arcTo(x, y, x + width, y, safeRadius)
  context.closePath()
}

export function exportReportCsv(rows: readonly ReportRow[], summary: ReportSummary) {
  const headers = [
    'codigo',
    'secao',
    'grupo',
    'nome',
    'tipo',
    'quantidade',
    'status',
    'especial',
  ]
  const lines = rows.map((row) =>
    [
      row.code,
      row.sectionName,
      row.group ? `Grupo ${row.group}` : '',
      row.title,
      row.type,
      row.quantity,
      row.status,
      row.isSpecial ? 'sim' : 'nao',
    ]
      .map(csvCell)
      .join(';'),
  )

  downloadBlob(
    `\uFEFF${[headers.map(csvCell).join(';'), ...lines].join('\n')}`,
    'text/csv;charset=utf-8',
    `${reportBaseName(summary)}.csv`,
  )
}

export async function exportReportPdf(rows: readonly ReportRow[], summary: ReportSummary) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14
  const rowHeight = 7
  const footerY = pageHeight - 8
  let y = 16

  function addHeader(pageNumber: number) {
    doc.setFillColor(35, 83, 71)
    doc.rect(0, 0, pageWidth, 12, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('Album Copa 2026', margin, 8)
    doc.setFontSize(8)
    doc.text(`Pagina ${pageNumber}`, pageWidth - margin, 8, { align: 'right' })
    doc.setTextColor(17, 24, 39)
  }

  function addFooter() {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(102, 112, 133)
    doc.text(`Gerado em ${formatGeneratedAt(summary.generatedAt)}`, margin, footerY)
    doc.text(`${summary.totalRows} linhas`, pageWidth - margin, footerY, { align: 'right' })
    doc.setTextColor(17, 24, 39)
  }

  function addTableHeader() {
    doc.setFillColor(244, 246, 248)
    doc.rect(margin, y - 4.5, pageWidth - margin * 2, 7, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text('Codigo', margin + 1, y)
    doc.text('Secao', 36, y)
    doc.text('Nome', 70, y)
    doc.text('Qtd', 160, y)
    doc.text('Status', 174, y)
    y += 7
  }

  function addNewPage() {
    addFooter()
    doc.addPage()
    addHeader(doc.getNumberOfPages())
    y = 20
    addTableHeader()
  }

  addHeader(1)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.text(summary.title, margin, y)
  y += 9
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(102, 112, 133)
  doc.text(`Conteudo: ${summary.filterLabel}`, margin, y)
  doc.text(`Secao: ${summary.sectionLabel}`, 78, y)
  y += 6
  doc.text(
    `Linhas: ${summary.totalRows} | Tenho: ${summary.ownedRows} | Faltantes: ${summary.missingRows} | Repetidas: ${summary.repeatedTotal}`,
    margin,
    y,
  )
  doc.setTextColor(17, 24, 39)
  y += 11
  addTableHeader()

  rows.forEach((row, index) => {
    if (y > pageHeight - 18) {
      addNewPage()
    }

    if (index % 2 === 0) {
      doc.setFillColor(250, 251, 252)
      doc.rect(margin, y - 4.8, pageWidth - margin * 2, rowHeight, 'F')
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(17, 24, 39)
    doc.text(row.code, margin + 1, y)
    doc.text(row.sectionCode, 36, y)
    doc.text(doc.splitTextToSize(row.title, 84)[0], 70, y)
    doc.text(String(row.quantity), 163, y, { align: 'right' })
    doc.text(row.status, 174, y)
    y += rowHeight
  })

  addFooter()
  doc.save(`${reportBaseName(summary)}.pdf`)
}

function fitText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (context.measureText(text).width <= maxWidth) {
    return text
  }

  let clipped = text
  while (clipped.length > 0 && context.measureText(`${clipped}...`).width > maxWidth) {
    clipped = clipped.slice(0, -1)
  }

  return `${clipped}...`
}

export function exportReportPng(rows: readonly ReportRow[], summary: ReportSummary) {
  const width = 1400
  const headerHeight = 212
  const rowHeight = 28
  const height = Math.max(520, headerHeight + rows.length * rowHeight + 44)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Canvas indisponivel para exportar PNG.')
  }

  canvas.width = width
  canvas.height = height

  context.fillStyle = '#f4f6f8'
  context.fillRect(0, 0, width, height)
  context.fillStyle = '#235347'
  context.fillRect(0, 0, width, 72)
  context.fillStyle = '#ffffff'
  context.font = '700 34px Arial'
  context.fillText(summary.title, 44, 46)
  context.font = '400 18px Arial'
  context.fillText(`${summary.filterLabel} - ${summary.sectionLabel}`, 44, 102)
  context.fillText(`Gerado em ${formatGeneratedAt(summary.generatedAt)}`, 44, 132)

  const stats = [
    ['Linhas', summary.totalRows],
    ['Tenho', summary.ownedRows],
    ['Faltantes', summary.missingRows],
    ['Repetidas', summary.repeatedTotal],
  ]

  stats.forEach(([label, value], index) => {
    const x = 44 + index * 180
    context.fillStyle = '#ffffff'
    context.fillRect(x, 150, 150, 44)
    context.fillStyle = '#667085'
    context.font = '700 12px Arial'
    context.fillText(String(label).toUpperCase(), x + 12, 168)
    context.fillStyle = '#111827'
    context.font = '700 18px Arial'
    context.fillText(String(value), x + 12, 188)
  })

  let y = headerHeight
  context.fillStyle = '#111827'
  context.font = '700 14px Arial'
  context.fillText('Codigo', 44, y)
  context.fillText('Secao', 150, y)
  context.fillText('Nome', 300, y)
  context.fillText('Qtd', 1090, y)
  context.fillText('Status', 1170, y)
  y += 12

  rows.forEach((row, index) => {
    context.fillStyle = index % 2 === 0 ? '#ffffff' : '#f9fafb'
    context.fillRect(32, y - 14, width - 64, rowHeight)
    context.fillStyle = '#111827'
    context.font = '700 14px Arial'
    context.fillText(row.code, 44, y + 5)
    context.font = '400 14px Arial'
    context.fillText(`${row.sectionCode}${row.group ? ` - Grupo ${row.group}` : ''}`, 150, y + 5)
    context.fillText(fitText(context, row.title, 740), 300, y + 5)
    context.fillText(String(row.quantity), 1090, y + 5)
    context.fillText(row.status, 1170, y + 5)
    y += rowHeight
  })

  const url = canvas.toDataURL('image/png')
  const link = document.createElement('a')
  link.href = url
  link.download = `${reportBaseName(summary)}.png`
  document.body.append(link)
  link.click()
  link.remove()
}

export function exportReportMobilePng(rows: readonly ReportRow[], summary: ReportSummary) {
  const groups = buildCompactReportGroups(rows, summary)
  const width = 1080
  const padding = 48
  const contentWidth = width - padding * 2
  const headerHeight = 250
  const groupGap = 20
  const cardPadding = 26
  const sectionLineHeight = 34
  const itemLineHeight = 38
  const footerHeight = 52
  const measureCanvas = document.createElement('canvas')
  const measureContext = measureCanvas.getContext('2d')

  if (!measureContext) {
    throw new Error('Canvas indisponivel para exportar PNG mobile.')
  }

  measureContext.font = '700 30px Arial'

  const measuredGroups = groups.map((group) => {
    const itemLines = wrapCompactItems(
      measureContext,
      group.sectionCode,
      group.items,
      contentWidth - cardPadding * 2,
    )
    const height = cardPadding * 2 + sectionLineHeight + itemLines.length * itemLineHeight

    return {
      ...group,
      itemLines,
      height,
    }
  })
  const emptyHeight = groups.length === 0 ? 150 : 0
  const height =
    headerHeight +
    measuredGroups.reduce((total, group) => total + group.height + groupGap, 0) +
    emptyHeight +
    footerHeight +
    padding
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Canvas indisponivel para exportar PNG mobile.')
  }

  canvas.width = width
  canvas.height = Math.max(720, height)

  context.fillStyle = '#0b1120'
  context.fillRect(0, 0, canvas.width, canvas.height)

  const headerGradient = context.createLinearGradient(0, 0, width, 210)
  headerGradient.addColorStop(0, '#12372f')
  headerGradient.addColorStop(1, '#0b1120')
  context.fillStyle = headerGradient
  context.fillRect(0, 0, width, 220)

  context.fillStyle = '#f8fafc'
  context.font = '800 46px Arial'
  context.fillText('Copa 2026', padding, 70)
  context.font = '800 34px Arial'
  context.fillText(compactTitle(summary), padding, 128)

  context.fillStyle = '#34d399'
  context.fillRect(padding, 150, 210, 6)

  context.fillStyle = '#d7dde8'
  context.font = '600 22px Arial'
  context.fillText(`${compactCount(summary)} item(ns)`, padding, 190)
  context.fillStyle = '#9aa5b5'
  context.font = '400 20px Arial'
  context.fillText(`Gerado em ${formatGeneratedAt(summary.generatedAt)}`, padding + 170, 190)

  let y = headerHeight

  if (measuredGroups.length === 0) {
    context.fillStyle = '#d7dde8'
    context.font = '700 28px Arial'
    context.fillText('Nenhuma figurinha encontrada para esse filtro.', padding, y)
    y += emptyHeight
  }

  measuredGroups.forEach((group) => {
    drawRoundRect(context, padding, y, contentWidth, group.height, 18)
    context.fillStyle = '#172033'
    context.fill()
    context.strokeStyle = '#273244'
    context.lineWidth = 2
    context.stroke()

    const titleY = y + cardPadding
    context.fillStyle = '#34d399'
    context.font = '800 26px Arial'
    context.fillText(group.sectionCode, padding + cardPadding, titleY)

    context.fillStyle = '#f8fafc'
    context.font = '800 26px Arial'
    context.fillText(group.sectionName, padding + cardPadding + 92, titleY)

    context.fillStyle = '#d7dde8'
    context.font = '700 30px Arial'
    group.itemLines.forEach((line, index) => {
      context.fillText(line, padding + cardPadding, titleY + 40 + index * itemLineHeight)
    })

    y += group.height + groupGap
  })

  context.fillStyle = '#64748b'
  context.font = '500 18px Arial'
  context.fillText('Album Copa 2026 Local', padding, canvas.height - 34)

  const url = canvas.toDataURL('image/png')
  const link = document.createElement('a')
  link.href = url
  link.download = `${reportBaseName(summary)}-celular.png`
  document.body.append(link)
  link.click()
  link.remove()
}

export async function exportReportWhatsappText(
  rows: readonly ReportRow[],
  summary: ReportSummary,
): Promise<WhatsappTextExportResult> {
  const text = buildWhatsappReportText(rows, summary)

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return 'copied'
    } catch {
      // Some browsers block clipboard access; downloading a TXT keeps the export usable.
    }
  }

  downloadBlob(text, 'text/plain;charset=utf-8', `${reportBaseName(summary)}-whatsapp.txt`)
  return 'downloaded'
}
