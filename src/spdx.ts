import * as spdxlib from '@onebeyond/spdx-license-satisfies'
import spdxSatisfies from 'spdx-satisfies'
import parse from 'spdx-expression-parse'
import licenseIds from 'spdx-license-ids'
import deprecatedLicenseIds from 'spdx-license-ids/deprecated'
import exceptionIds from 'spdx-exceptions'

/*
 * NOTE: spdx-license-satisfies methods depend on spdx-expression-parse
 * which throws errors in the presence of any syntax trouble, unknown
 * license tokens, case sensitivity problems etc. to simplify handling
 * you should pre-screen inputs to the satisfies* methods using isValid
 */

// accepts a pair of well-formed SPDX expressions. the
// candidate is tested against the constraint
export function satisfies(candidateExpr: string, allowList: string[]): boolean {
  candidateExpr = cleanInvalidSPDX(candidateExpr)
  try {
    return spdxSatisfies(candidateExpr, allowList)
  } catch {
    return false
  }
}

// accepts an SPDX expression and a non-empty list of licenses (not expressions)
export function satisfiesAny(
  candidateExpr: string,
  licenses: string[]
): boolean {
  candidateExpr = cleanInvalidSPDX(candidateExpr)
  try {
    return spdxlib.satisfiesAny(candidateExpr, licenses)
  } catch {
    return false
  }
}

// accepts an SPDX expression and a non-empty list of licenses (not expressions)
export function satisfiesAll(
  candidateExpr: string,
  licenses: string[]
): boolean {
  candidateExpr = cleanInvalidSPDX(candidateExpr)
  try {
    return spdxlib.satisfiesAll(candidateExpr, licenses)
  } catch {
    return false
  }
}

// accepts any SPDX expression
export function isValid(spdxExpr: string): boolean {
  spdxExpr = cleanInvalidSPDX(spdxExpr)
  try {
    parse(spdxExpr)
    return true
  } catch {
    return false
  }
}

const replaceOtherRegex = /(?<![\w-])OTHER(?![\w-])/g

// adjusts license expressions to not include the invalid `OTHER`
// which ClearlyDefined adds to license strings
export function cleanInvalidSPDX(spdxExpr: string): string {
  return spdxExpr.replace(replaceOtherRegex, 'LicenseRef-clearlydefined-OTHER')
}

// operators must be uppercase: the parser inside spdx-satisfies rejects
// lowercase ones (unlike spdx-expression-parse v4), breaking allow/deny checks
const operators = ['AND', 'OR', 'WITH']

const canonicalTokens = new Map<string, string>(
  [...deprecatedLicenseIds, ...licenseIds, ...exceptionIds, ...operators].map(
    id => [id.toLowerCase(), id]
  )
)

const licenseTokenRegex = /[\w.-]+/g

// fixes the casing of known license IDs, e.g. `bsd-3-clause` becomes
// `BSD-3-Clause`. Some registries (like pub.dev) report license IDs in
// lowercase, which the case-sensitive SPDX parser rejects
export function normalizeLicenseCase(spdxExpr: string): string {
  return spdxExpr.replace(
    licenseTokenRegex,
    token => canonicalTokens.get(token.toLowerCase()) ?? token
  )
}
