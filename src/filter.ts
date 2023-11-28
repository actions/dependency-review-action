import {Changes, Severity, SEVERITIES, Scope} from './schemas'

/**
 * Filters changes by a severity level. Only vulnerable
 * dependencies will be returned.
 *
 * @param severity - The severity level to filter by.
 * @param changes - The array of changes to filter.
 * @returns The filtered array of changes that match the specified severity level and have vulnerabilities.
 */
export function filterChangesBySeverity(
  severity: Severity,
  changes: Changes
): Changes {
  const severityIdx = SEVERITIES.indexOf(severity)
  let filteredChanges = []
  for (const change of changes) {
    if (
      change === undefined ||
      change.vulnerabilities === undefined ||
      change.vulnerabilities.length === 0
    ) {
      continue
    }

    const fChange = {
      ...change,
      vulnerabilities: change.vulnerabilities.filter(vuln => {
        const vulnIdx = SEVERITIES.indexOf(vuln.severity)
        if (vulnIdx <= severityIdx) {
          return true
        }
      })
    }
    filteredChanges.push(fChange)
  }

  // don't want to deal with changes with no vulnerabilities
  filteredChanges = filteredChanges.filter(
    change => change.vulnerabilities.length > 0
  )

  // only report vulnerability additions
  return filteredChanges.filter(
    change =>
      change.change_type === 'added' &&
      change.vulnerabilities !== undefined &&
      change.vulnerabilities.length > 0
  )
}

export function filterChangesByScopes(
  scopes: Scope[] | undefined,
  changes: Changes
): Changes {
  if (scopes === undefined) {
    return []
  }

  const filteredChanges = changes.filter(change => {
    // if there is no scope on the change (Enterprise Server API for now), we will assume it is a runtime scope
    const scope = change.scope || 'runtime'
    return scopes.includes(scope)
  })

  return filteredChanges
}

/**
 * Filter out changes that are allowed by the allow_ghsas config
 * option. We want to remove these changes before we do any
 * processing.
 * @param ghsas - list of GHSA IDs to allow
 * @param changes - list of changes to filter
 * @returns a list of changes with the allowed GHSAs removed
 */
export function filterAllowedAdvisories(
  ghsas: string[] | undefined,
  changes: Changes
): Changes {
  if (ghsas === undefined) {
    return changes
  }

  const filteredChanges = changes.map(change => {
    const noAdvisories =
      change.vulnerabilities === undefined ||
      change.vulnerabilities.length === 0

    if (noAdvisories) {
      return change
    }
    const newChange = {...change}
    newChange.vulnerabilities = change.vulnerabilities.filter(
      vuln => !ghsas.includes(vuln.advisory_ghsa_id)
    )

    return newChange
  })

  return filteredChanges
}
