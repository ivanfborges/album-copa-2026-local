const countryCodeBySectionCode: Record<string, string> = {
  ALG: 'DZ',
  ARG: 'AR',
  AUS: 'AU',
  AUT: 'AT',
  BEL: 'BE',
  BIH: 'BA',
  BRA: 'BR',
  CAN: 'CA',
  CIV: 'CI',
  COD: 'CD',
  COL: 'CO',
  CPV: 'CV',
  CRO: 'HR',
  CUW: 'CW',
  CZE: 'CZ',
  ECU: 'EC',
  EGY: 'EG',
  ESP: 'ES',
  FRA: 'FR',
  GER: 'DE',
  GHA: 'GH',
  HAI: 'HT',
  IRN: 'IR',
  IRQ: 'IQ',
  JPN: 'JP',
  JOR: 'JO',
  KOR: 'KR',
  KSA: 'SA',
  MAR: 'MA',
  MEX: 'MX',
  NED: 'NL',
  NOR: 'NO',
  NZL: 'NZ',
  PAN: 'PA',
  PAR: 'PY',
  POR: 'PT',
  QAT: 'QA',
  RSA: 'ZA',
  SEN: 'SN',
  SUI: 'CH',
  SWE: 'SE',
  TUN: 'TN',
  TUR: 'TR',
  URU: 'UY',
  USA: 'US',
  UZB: 'UZ',
}

const subdivisionCodeBySectionCode: Record<string, string> = {
  ENG: 'gbeng',
  SCO: 'gbsct',
}

function flagFromCountryCode(countryCode: string) {
  return countryCode
    .toUpperCase()
    .replace(/[A-Z]/g, (letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)))
}

function flagFromSubdivisionCode(subdivisionCode: string) {
  const tagCharacters = [...subdivisionCode.toLowerCase()].map(
    (letter) => 0xe0061 + letter.charCodeAt(0) - 'a'.charCodeAt(0),
  )

  return String.fromCodePoint(0x1f3f4, ...tagCharacters, 0xe007f)
}

export function getFlagEmojiForSection(sectionCode: string) {
  const subdivisionCode = subdivisionCodeBySectionCode[sectionCode]

  if (subdivisionCode) {
    return flagFromSubdivisionCode(subdivisionCode)
  }

  const countryCode = countryCodeBySectionCode[sectionCode]
  return countryCode ? flagFromCountryCode(countryCode) : ''
}
