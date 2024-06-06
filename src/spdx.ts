import * as spdxlib from '@onebeyond/spdx-license-satisfies'
import parse from 'spdx-expression-parse'

/*
 * NOTE: spdx-license-satisfies methods depend on spdx-expression-parse
 * which throws errors in the presence of any syntax trouble, unknown
 * license tokens, case sensitivity problems etc. to simplify handling
 * you should pre-screen inputs to the satisfies* methods using isValid
 */

// accepts a pair of well-formed SPDX expressions. the
// candidate is tested against the constraint
export function satisfies(
  candidateExpr: string,
  constraintExpr: string
): boolean {
  try {
    return spdxlib.satisfies(candidateExpr, constraintExpr)
  } catch (_) {
    return false
  }
}

// accepts an SPDX expression and a non-empty list of licenses (not expressions)
export function satisfiesAny(
  candidateExpr: string,
  licenses: string[]
): boolean {
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
  try {
    return spdxlib.satisfiesAll(candidateExpr, licenses)
  } catch (_) {
    return false
  }
}

// accepts any SPDX expression
export function isValid(spdxExpr: string): boolean {
  try {
    parse(spdxExpr)
    return true
  } catch (_) {
    return false
  }
}
