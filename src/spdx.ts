import * as spdxlib from '@onebeyond/spdx-license-satisfies'
import spdxSatisfies from 'spdx-satisfies'
import parse from 'spdx-expression-parse'

/*
 * NOTE: spdx-license-satisfies methods depend on spdx-expression-parse
 * which throws errors in the presence of any syntax trouble, unknown
 * license tokens, case sensitivity problems etc. to simplify handling
 * you should pre-screen inputs to the satisfies* methods using isValid
 */

// accepts a pair of well-formed SPDX expressions. the
// candidate is tested against the constraint
export function satisfies(candidateExpr: string, allowList: string[]): boolean {
  candidateExpr = removeInvalidSPDX(candidateExpr)
  try {
    return spdxSatisfies(candidateExpr, allowList)
  } catch (_) {
    return false
  }
}

// accepts an SPDX expression and a non-empty list of licenses (not expressions)
export function satisfiesAny(
  candidateExpr: string,
  licenses: string[]
): boolean {
  candidateExpr = removeInvalidSPDX(candidateExpr)
  try {
    return spdxlib.satisfiesAny(candidateExpr, licenses)
  } catch (_) {
    return false
  }
}

// accepts an SPDX expression and a non-empty list of licenses (not expressions)
export function satisfiesAll(
  candidateExpr: string,
  licenses: string[]
): boolean {
  candidateExpr = removeInvalidSPDX(candidateExpr)
  try {
    return spdxlib.satisfiesAll(candidateExpr, licenses)
  } catch (_) {
    return false
  }
}

// accepts any SPDX expression
export function isValid(spdxExpr: string): boolean {
  spdxExpr = removeInvalidSPDX(spdxExpr)
  try {
    parse(spdxExpr)
    return true
  } catch (_) {
    return false
  }
}

const replaceOtherRegex = /(?<![\w-])OTHER(?![\w-])/

// adjusts license expressions to not include the invalid `OTHER`
// which ClearlyDefined adds to license strings
export function removeInvalidSPDX(spdxExpr: string): string {
  return spdxExpr.replace(replaceOtherRegex, 'LicenseRef-clearlydefined-OTHER')
}
