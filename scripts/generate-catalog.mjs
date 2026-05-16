import { writeFile } from 'node:fs/promises'

const ALBUM_URL = 'https://scanini.app/albums/world-cup-2026'
const BASE_URL = 'https://scanini.app'
const OUTPUT_PATH = 'src/data/catalog.ts'

function decodeHtml(value) {
  const decoded = value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, '')
    .trim()

  const repaired = /[ÃÂâ]/.test(decoded)
    ? Buffer.from(decoded, 'latin1').toString('utf8')
    : decoded

  return repaired.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function normalizeCode(value) {
  return value.replace(/\s+/g, '')
}

function getStickerType(rawType) {
  const type = rawType.toLowerCase()

  if (type.includes('team logo')) {
    return 'badge'
  }

  if (type.includes('team photo')) {
    return 'team_photo'
  }

  if (type.includes('player')) {
    return 'player'
  }

  if (type.includes('extra')) {
    return 'extra'
  }

  return 'special'
}

async function fetchText(url) {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Request failed ${response.status}: ${url}`)
  }

  return response.text()
}

function extractSections(albumHtml) {
  const sectionRegex = /<a href="(\/teams\/[^"]+)"[\s\S]*?<\/a>/g
  const sections = []
  const seen = new Set()

  for (const match of albumHtml.matchAll(sectionRegex)) {
    const block = match[0]
    const path = match[1]
    const code = block.match(/-rotate-3">([^<]+)<\/span>/)?.[1]
    const name = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1]
    const count = block.match(/>(\d+)\s+stickers<\/span>/)?.[1]

    if (!code || !name || !count || seen.has(path)) {
      continue
    }

    seen.add(path)
    sections.push({
      path,
      code: decodeHtml(code),
      name: decodeHtml(name),
      expectedCount: Number(count),
    })
  }

  return sections
}

function extractStickers(section, html, orderOffset) {
  const stickerRegex =
    /<span[^>]*>([A-Z0-9]+(?:\s+\d+)?)<\/span>\s*<span[^>]*>([\s\S]*?)<\/span>\s*<span[^>]*>([\s\S]*?)<\/span>/g
  const stickers = []

  for (const match of html.matchAll(stickerRegex)) {
    const displayCode = decodeHtml(match[1]).replace(/\s+/g, ' ')
    const title = decodeHtml(match[2])
    const rawType = decodeHtml(match[3])
    const numberMatch = displayCode.match(/(\d+)$/)
    const number = numberMatch ? Number(numberMatch[1]) : 0
    const id = normalizeCode(displayCode)
    const type = getStickerType(rawType)

    stickers.push({
      id,
      displayCode,
      sectionCode: section.code,
      sectionName: section.name,
      teamCode: section.code,
      teamName: section.name,
      number,
      title,
      type,
      isSpecial: rawType.toLowerCase().includes('foil') || type === 'special',
      albumOrder: orderOffset + stickers.length + 1,
    })
  }

  return stickers
}

function renderCatalog(sections, stickers) {
  const body = JSON.stringify(stickers, null, 2)
  const sectionBody = JSON.stringify(sections, null, 2)

  return `import type { Sticker, StickerSection } from '../types'\n\nexport const stickerSections = ${sectionBody} as const satisfies StickerSection[]\n\nexport const stickers = ${body} as const satisfies Sticker[]\n`
}

const albumHtml = await fetchText(ALBUM_URL)
const sections = extractSections(albumHtml)
const stickers = []

for (const section of sections) {
  const html = await fetchText(`${BASE_URL}${section.path}`)
  const sectionStickers = extractStickers(section, html, stickers.length)

  if (sectionStickers.length !== section.expectedCount) {
    throw new Error(
      `${section.code} expected ${section.expectedCount}, got ${sectionStickers.length}`,
    )
  }

  stickers.push(...sectionStickers)
}

if (stickers.length !== 980) {
  throw new Error(`Expected 980 stickers, got ${stickers.length}`)
}

await writeFile(OUTPUT_PATH, renderCatalog(sections, stickers), 'utf8')

console.log(`Generated ${stickers.length} stickers across ${sections.length} sections.`)
