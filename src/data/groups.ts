export type WorldCupGroup = {
  group: string
  codes: string[]
}

export const worldCupGroups: WorldCupGroup[] = [
  { group: 'A', codes: ['MEX', 'RSA', 'KOR', 'CZE'] },
  { group: 'B', codes: ['CAN', 'BIH', 'QAT', 'SUI'] },
  { group: 'C', codes: ['BRA', 'MAR', 'HAI', 'SCO'] },
  { group: 'D', codes: ['USA', 'PAR', 'AUS', 'TUR'] },
  { group: 'E', codes: ['GER', 'CUW', 'CIV', 'ECU'] },
  { group: 'F', codes: ['NED', 'JPN', 'SWE', 'TUN'] },
  { group: 'G', codes: ['BEL', 'EGY', 'IRN', 'NZL'] },
  { group: 'H', codes: ['ESP', 'CPV', 'KSA', 'URU'] },
  { group: 'I', codes: ['FRA', 'SEN', 'IRQ', 'NOR'] },
  { group: 'J', codes: ['ARG', 'ALG', 'AUT', 'JOR'] },
  { group: 'K', codes: ['POR', 'COD', 'UZB', 'COL'] },
  { group: 'L', codes: ['ENG', 'CRO', 'GHA', 'PAN'] },
]

export const sectionOrder = ['PANINI', 'FWC', ...worldCupGroups.flatMap((group) => group.codes)]

export const sectionOrderByCode = new Map(sectionOrder.map((code, index) => [code, index]))

export const groupBySectionCode = new Map(
  worldCupGroups.flatMap((group) => group.codes.map((code) => [code, group.group] as const)),
)
