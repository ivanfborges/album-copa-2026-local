import dz from 'flag-icons/flags/4x3/dz.svg'
import ar from 'flag-icons/flags/4x3/ar.svg'
import au from 'flag-icons/flags/4x3/au.svg'
import at from 'flag-icons/flags/4x3/at.svg'
import be from 'flag-icons/flags/4x3/be.svg'
import ba from 'flag-icons/flags/4x3/ba.svg'
import br from 'flag-icons/flags/4x3/br.svg'
import ca from 'flag-icons/flags/4x3/ca.svg'
import ci from 'flag-icons/flags/4x3/ci.svg'
import cd from 'flag-icons/flags/4x3/cd.svg'
import co from 'flag-icons/flags/4x3/co.svg'
import cv from 'flag-icons/flags/4x3/cv.svg'
import hr from 'flag-icons/flags/4x3/hr.svg'
import cw from 'flag-icons/flags/4x3/cw.svg'
import cz from 'flag-icons/flags/4x3/cz.svg'
import ec from 'flag-icons/flags/4x3/ec.svg'
import eg from 'flag-icons/flags/4x3/eg.svg'
import gbEng from 'flag-icons/flags/4x3/gb-eng.svg'
import es from 'flag-icons/flags/4x3/es.svg'
import fr from 'flag-icons/flags/4x3/fr.svg'
import de from 'flag-icons/flags/4x3/de.svg'
import gh from 'flag-icons/flags/4x3/gh.svg'
import ht from 'flag-icons/flags/4x3/ht.svg'
import ir from 'flag-icons/flags/4x3/ir.svg'
import iq from 'flag-icons/flags/4x3/iq.svg'
import jp from 'flag-icons/flags/4x3/jp.svg'
import jo from 'flag-icons/flags/4x3/jo.svg'
import kr from 'flag-icons/flags/4x3/kr.svg'
import ma from 'flag-icons/flags/4x3/ma.svg'
import mx from 'flag-icons/flags/4x3/mx.svg'
import nl from 'flag-icons/flags/4x3/nl.svg'
import no from 'flag-icons/flags/4x3/no.svg'
import nz from 'flag-icons/flags/4x3/nz.svg'
import pa from 'flag-icons/flags/4x3/pa.svg'
import py from 'flag-icons/flags/4x3/py.svg'
import pt from 'flag-icons/flags/4x3/pt.svg'
import qa from 'flag-icons/flags/4x3/qa.svg'
import sa from 'flag-icons/flags/4x3/sa.svg'
import za from 'flag-icons/flags/4x3/za.svg'
import gbSct from 'flag-icons/flags/4x3/gb-sct.svg'
import sn from 'flag-icons/flags/4x3/sn.svg'
import ch from 'flag-icons/flags/4x3/ch.svg'
import se from 'flag-icons/flags/4x3/se.svg'
import tn from 'flag-icons/flags/4x3/tn.svg'
import tr from 'flag-icons/flags/4x3/tr.svg'
import uy from 'flag-icons/flags/4x3/uy.svg'
import us from 'flag-icons/flags/4x3/us.svg'
import uz from 'flag-icons/flags/4x3/uz.svg'

const flagSrcBySectionCode: Record<string, string> = {
  ALG: dz,
  ARG: ar,
  AUS: au,
  AUT: at,
  BEL: be,
  BIH: ba,
  BRA: br,
  CAN: ca,
  CIV: ci,
  COD: cd,
  COL: co,
  CPV: cv,
  CRO: hr,
  CUW: cw,
  CZE: cz,
  ECU: ec,
  EGY: eg,
  ENG: gbEng,
  ESP: es,
  FRA: fr,
  GER: de,
  GHA: gh,
  HAI: ht,
  IRN: ir,
  IRQ: iq,
  JPN: jp,
  JOR: jo,
  KOR: kr,
  MAR: ma,
  MEX: mx,
  NED: nl,
  NOR: no,
  NZL: nz,
  PAN: pa,
  PAR: py,
  POR: pt,
  QAT: qa,
  KSA: sa,
  RSA: za,
  SCO: gbSct,
  SEN: sn,
  SUI: ch,
  SWE: se,
  TUN: tn,
  TUR: tr,
  URU: uy,
  USA: us,
  UZB: uz,
}

export function getFlagIconSrc(sectionCode: string) {
  return flagSrcBySectionCode[sectionCode]
}
