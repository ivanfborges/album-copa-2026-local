import { getFlagEmojiForSection } from '../data/flagEmojis'
import type { ReportRow, ReportSummary } from './reportData'

export type ReportExportFormat = 'csv' | 'pdf' | 'png' | 'mobilePng' | 'whatsappText' | 'a4Sheet'
export type WhatsappTextExportResult = 'copied' | 'downloaded'

export type CompactReportGroup = {
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

export function getCompactReportCount(summary: ReportSummary) {
  const label = summary.filterLabel.toLowerCase()

  if (label.includes('repetida')) {
    return summary.repeatedTotal
  }

  if (label.includes('faltante')) {
    return summary.missingRows
  }

  if (label.includes('tenho')) {
    return summary.ownedRows
  }

  return summary.totalRows
}

export function buildCompactReportTitle(summary: ReportSummary) {
  return `Figurinhas ${summary.filterLabel}`.toUpperCase()
}

export function buildCompactCategoryLine(summary: ReportSummary) {
  return `${buildCompactReportTitle(summary)} (${getCompactReportCount(summary)})`
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
  const lines = ['🏆 Copa 2026', `📦 ${buildCompactCategoryLine(summary)}`, '']

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

const a4SheetLayout = {
  margin: 5.5,
  labelWidth: 10.5,
  labelGap: 1,
  boxWidth: 7.2,
  boxHeight: 4.2,
  boxGap: 0.45,
  chunkGap: 0.35,
  rowGap: 0.45,
  groupGap: 1.45,
  headerY: 17,
  footerBottom: 5,
  pageBottom: 8,
} as const

function a4SheetMaxBoxesPerLine(pageWidth: number) {
  return Math.max(
    1,
    Math.floor(
      (pageWidth -
        a4SheetLayout.margin * 2 -
        a4SheetLayout.labelWidth -
        a4SheetLayout.labelGap +
        a4SheetLayout.boxGap) /
        (a4SheetLayout.boxWidth + a4SheetLayout.boxGap),
    ),
  )
}

function compactGroupKey(group: CompactReportGroup) {
  return group.group || group.sectionCode
}

function chunkCompactItems(items: readonly string[], size: number) {
  const chunks: string[][] = []

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }

  return chunks
}

export function exportReportCsv(rows: readonly ReportRow[], summary: ReportSummary) {
  const groups = buildCompactReportGroups(rows, summary)
  const headers = ['secao', 'selecao', 'figurinhas', 'total']
  const lines = groups.map((group) =>
    [group.sectionCode, group.sectionName, group.items.join(', '), group.items.length]
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
  await saveCompactSheetPdf(rows, summary, `${reportBaseName(summary)}.pdf`)
}

function printableStickerBoxLabel(item: string) {
  return item.replace(/\s*\(x(\d+)\)/, ' x$1')
}

async function saveCompactSheetPdf(rows: readonly ReportRow[], summary: ReportSummary, filename: string) {
  const groups = buildCompactReportGroups(rows, summary)
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const {
    margin,
    labelWidth,
    labelGap,
    boxWidth,
    boxHeight,
    boxGap,
    chunkGap,
    rowGap,
    groupGap,
    headerY,
    footerBottom,
    pageBottom,
  } = a4SheetLayout
  const footerY = pageHeight - footerBottom
  const maxBoxesPerLine = a4SheetMaxBoxesPerLine(pageWidth)
  let y = 10
  let currentGroupKey = ''

  function addHeader(pageNumber: number) {
    doc.setTextColor(17, 24, 39)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Copa 2026 - Folha A4 de conferencia', margin, 8)
    doc.setFontSize(6.6)
    doc.setTextColor(102, 112, 133)
    doc.text(buildCompactCategoryLine(summary), margin, 12)
    doc.text(summary.sectionLabel, pageWidth - margin, 8, { align: 'right' })
    doc.text(`Pagina ${pageNumber}`, pageWidth - margin, 12, { align: 'right' })
    doc.setDrawColor(35, 83, 71)
    doc.setLineWidth(0.25)
    doc.line(margin, 14, pageWidth - margin, 14)
    y = headerY
  }

  function addFooter() {
    doc.setTextColor(102, 112, 133)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(5.8)
    doc.text(`Gerado em ${formatGeneratedAt(summary.generatedAt)}`, margin, footerY)
    doc.text('Marque os quadradinhos com caneta durante as trocas.', pageWidth - margin, footerY, {
      align: 'right',
    })
  }

  function addNewPage() {
    addFooter()
    doc.addPage()
    addHeader(doc.getNumberOfPages())
    currentGroupKey = ''
  }

  function ensureSpace(height: number) {
    if (y + height > pageHeight - pageBottom) {
      addNewPage()
    }
  }

  addHeader(1)

  if (groups.length === 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(17, 24, 39)
    doc.text('Nenhuma figurinha encontrada para esse filtro.', margin, y)
    addFooter()
    doc.save(filename)
    return
  }

  groups.forEach((group) => {
    const chunks = chunkCompactItems(group.items, maxBoxesPerLine)
    const rowHeight = chunks.length * boxHeight + Math.max(0, chunks.length - 1) * chunkGap
    const groupKey = compactGroupKey(group)
    const needsGroupGap = Boolean(currentGroupKey && groupKey !== currentGroupKey)
    const requiredHeight = rowHeight + rowGap + (needsGroupGap ? groupGap : 0)

    ensureSpace(requiredHeight)

    if (needsGroupGap) {
      y += groupGap
    }
    currentGroupKey = groupKey

    doc.setFillColor(244, 246, 248)
    doc.setDrawColor(209, 216, 226)
    doc.rect(margin, y, labelWidth, boxHeight, 'FD')
    doc.setTextColor(17, 24, 39)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.4)
    doc.text(group.sectionCode, margin + labelWidth / 2, y + 2.85, { align: 'center' })

    chunks.forEach((chunk, chunkIndex) => {
      const chunkY = y + chunkIndex * (boxHeight + chunkGap)

      if (chunkIndex > 0) {
        doc.setDrawColor(209, 216, 226)
        doc.rect(margin, chunkY, labelWidth, boxHeight)
      }

      chunk.forEach((item, itemIndex) => {
        const x = margin + labelWidth + labelGap + itemIndex * (boxWidth + boxGap)

        doc.setFillColor(255, 255, 255)
        doc.setDrawColor(17, 24, 39)
        doc.rect(x, chunkY, boxWidth, boxHeight, 'FD')
        doc.setTextColor(17, 24, 39)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(4.2)
        doc.text(printableStickerBoxLabel(item), x + boxWidth / 2, chunkY + 2.8, {
          align: 'center',
          maxWidth: boxWidth - 1,
        })
      })
    })

    y += rowHeight + rowGap
  })

  addFooter()
  doc.save(filename)
}

export async function exportReportA4SheetPdf(rows: readonly ReportRow[], summary: ReportSummary) {
  await saveCompactSheetPdf(rows, summary, `${reportBaseName(summary)}-folha-a4.pdf`)
}

export function exportReportPng(rows: readonly ReportRow[], summary: ReportSummary) {
  const groups = buildCompactReportGroups(rows, summary)
  const pageWidth = 210
  const pageHeight = 297
  const scale = 6
  const pageGap = 5
  const {
    margin,
    labelWidth,
    labelGap,
    boxWidth,
    boxHeight,
    boxGap,
    chunkGap,
    rowGap,
    groupGap,
    headerY,
    footerBottom,
    pageBottom,
  } = a4SheetLayout
  const maxBoxesPerLine = a4SheetMaxBoxesPerLine(pageWidth)

  function countPages() {
    let pages = 1
    let y = headerY
    let currentGroupKey = ''

    groups.forEach((group) => {
      const chunks = chunkCompactItems(group.items, maxBoxesPerLine)
      const rowHeight = chunks.length * boxHeight + Math.max(0, chunks.length - 1) * chunkGap
      const groupKey = compactGroupKey(group)
      const needsGroupGap = Boolean(currentGroupKey && groupKey !== currentGroupKey)
      const requiredHeight = rowHeight + rowGap + (needsGroupGap ? groupGap : 0)

      if (y + requiredHeight > pageHeight - pageBottom) {
        pages += 1
        y = headerY
        currentGroupKey = ''
      }

      if (currentGroupKey && groupKey !== currentGroupKey) {
        y += groupGap
      }

      currentGroupKey = groupKey
      y += rowHeight + rowGap
    })

    return pages
  }

  const pageCount = countPages()
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d') as CanvasRenderingContext2D

  if (!context) {
    throw new Error('Canvas indisponivel para exportar PNG.')
  }

  function mm(value: number) {
    return value * scale
  }

  function pt(value: number) {
    return (value * scale) / 2.83465
  }

  function pageTop(pageIndex: number) {
    return pageIndex * mm(pageHeight + pageGap)
  }

  function setFont(size: number, weight = '700') {
    context.font = `${weight} ${pt(size).toFixed(2)}px Arial`
  }

  function drawText(
    text: string,
    x: number,
    y: number,
    options: {
      align?: CanvasTextAlign
      color?: string
      maxWidth?: number
      pageIndex?: number
      size?: number
      weight?: string
    } = {},
  ) {
    const pageIndex = options.pageIndex ?? 0

    context.fillStyle = options.color ?? '#111827'
    context.textAlign = options.align ?? 'left'
    context.textBaseline = 'alphabetic'
    setFont(options.size ?? 5.4, options.weight ?? '700')

    if (options.maxWidth) {
      context.fillText(text, mm(x), pageTop(pageIndex) + mm(y), mm(options.maxWidth))
      return
    }

    context.fillText(text, mm(x), pageTop(pageIndex) + mm(y))
  }

  function drawFittedText(
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    pageIndex: number,
    size = 4.2,
    minSize = 3.2,
  ) {
    let currentSize = size

    do {
      setFont(currentSize)
      currentSize -= 0.2
    } while (context.measureText(text).width > mm(maxWidth) && currentSize >= minSize)

    context.fillStyle = '#111827'
    context.textAlign = 'center'
    context.textBaseline = 'alphabetic'
    context.fillText(text, mm(x), pageTop(pageIndex) + mm(y))
  }

  function drawRect(
    x: number,
    y: number,
    width: number,
    height: number,
    pageIndex: number,
    fill: string,
    stroke: string,
  ) {
    context.fillStyle = fill
    context.strokeStyle = stroke
    context.lineWidth = Math.max(1, mm(0.12))
    context.fillRect(mm(x), pageTop(pageIndex) + mm(y), mm(width), mm(height))
    context.strokeRect(mm(x), pageTop(pageIndex) + mm(y), mm(width), mm(height))
  }

  function drawHeader(pageIndex: number) {
    const top = pageTop(pageIndex)

    context.fillStyle = '#ffffff'
    context.fillRect(0, top, mm(pageWidth), mm(pageHeight))
    drawText('Copa 2026 - Folha A4 de conferencia', margin, 8, { pageIndex, size: 10 })
    drawText(buildCompactCategoryLine(summary), margin, 12, {
      color: '#667085',
      pageIndex,
      size: 6.6,
    })
    drawText(summary.sectionLabel, pageWidth - margin, 8, {
      align: 'right',
      color: '#667085',
      pageIndex,
      size: 6.6,
    })
    drawText(`Pagina ${pageIndex + 1}`, pageWidth - margin, 12, {
      align: 'right',
      color: '#667085',
      pageIndex,
      size: 6.6,
    })

    context.strokeStyle = '#235347'
    context.lineWidth = Math.max(1, mm(0.25))
    context.beginPath()
    context.moveTo(mm(margin), top + mm(14))
    context.lineTo(mm(pageWidth - margin), top + mm(14))
    context.stroke()
  }

  function drawFooter(pageIndex: number) {
    drawText(`Gerado em ${formatGeneratedAt(summary.generatedAt)}`, margin, pageHeight - footerBottom, {
      color: '#667085',
      pageIndex,
      size: 5.8,
      weight: '400',
    })
    drawText(
      'Marque os quadradinhos com caneta durante as trocas.',
      pageWidth - margin,
      pageHeight - footerBottom,
      {
        align: 'right',
        color: '#667085',
        pageIndex,
        size: 5.8,
        weight: '400',
      },
    )
  }

  canvas.width = mm(pageWidth)
  canvas.height = mm(pageCount * pageHeight + Math.max(0, pageCount - 1) * pageGap)
  context.fillStyle = pageCount > 1 ? '#e5e7eb' : '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)

  let pageIndex = 0
  let y = headerY
  let currentGroupKey = ''
  drawHeader(pageIndex)

  if (groups.length === 0) {
    drawText('Nenhuma figurinha encontrada para esse filtro.', margin, y, {
      pageIndex,
      size: 10,
      weight: '400',
    })
  }

  groups.forEach((group) => {
    const chunks = chunkCompactItems(group.items, maxBoxesPerLine)
    const rowHeight = chunks.length * boxHeight + Math.max(0, chunks.length - 1) * chunkGap
    const groupKey = compactGroupKey(group)
    const needsGroupGap = Boolean(currentGroupKey && groupKey !== currentGroupKey)
    const requiredHeight = rowHeight + rowGap + (needsGroupGap ? groupGap : 0)

    if (y + requiredHeight > pageHeight - pageBottom) {
      drawFooter(pageIndex)
      pageIndex += 1
      y = headerY
      currentGroupKey = ''
      drawHeader(pageIndex)
    }

    if (currentGroupKey && groupKey !== currentGroupKey) {
      y += groupGap
    }
    currentGroupKey = groupKey

    drawRect(margin, y, labelWidth, boxHeight, pageIndex, '#f4f6f8', '#d1d8e2')
    drawFittedText(group.sectionCode, margin + labelWidth / 2, y + 2.85, labelWidth - 1, pageIndex, 5.4)

    chunks.forEach((chunk, chunkIndex) => {
      const chunkY = y + chunkIndex * (boxHeight + chunkGap)

      if (chunkIndex > 0) {
        drawRect(margin, chunkY, labelWidth, boxHeight, pageIndex, '#ffffff', '#d1d8e2')
      }

      chunk.forEach((item, itemIndex) => {
        const x = margin + labelWidth + labelGap + itemIndex * (boxWidth + boxGap)

        drawRect(x, chunkY, boxWidth, boxHeight, pageIndex, '#ffffff', '#111827')
        drawFittedText(
          printableStickerBoxLabel(item),
          x + boxWidth / 2,
          chunkY + 2.8,
          boxWidth - 1,
          pageIndex,
          4.2,
          3,
        )
      })
    })

    y += rowHeight + rowGap
  })

  drawFooter(pageIndex)

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
  const headerHeight = 220
  const groupGap = 14
  const cardPadding = 24
  const itemLineHeight = 36
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
    const height = cardPadding * 2 + itemLines.length * itemLineHeight

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
  context.fillText(buildCompactCategoryLine(summary), padding, 128)

  context.fillStyle = '#34d399'
  context.fillRect(padding, 150, 210, 6)

  context.fillStyle = '#d7dde8'
  context.font = '600 22px Arial'
  context.fillText(`${groups.length} secao(oes)`, padding, 190)
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

    const titleY = y + cardPadding + 6
    context.fillStyle = '#d7dde8'
    context.font = '700 30px Arial'
    group.itemLines.forEach((line, index) => {
      context.fillText(line, padding + cardPadding, titleY + index * itemLineHeight)
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
