import * as spdx from '@onebeyond/spdx-license-satisfies'
import parse from 'spdx-expression-parse'

export function satisfies(
  candidateExpr: string,
  constraintExpr: string
): boolean {
  return spdx.satisfies(candidateExpr, constraintExpr)
}

// can be a single license or an SPDX expression
export function isValid(spdxExpr: string): boolean {
  try {
    parse(spdxExpr)
    return true
  } catch (_) {
    return false
  }
}
