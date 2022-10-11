import {Changes, Severity, SEVERITIES, Scope} from './schemas'

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
  return filteredChanges
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

  const filteredChanges = changes.filter(change => {
    const noAdvisories =
      change.vulnerabilities === undefined ||
      change.vulnerabilities.length === 0

    if (noAdvisories) {
      return true
    }

    let allAllowedAdvisories = true
    // if there's at least one advisory that is not allowlisted, we will keep the change
    for (const vulnerability of change.vulnerabilities) {
      if (!ghsas.includes(vulnerability.advisory_ghsa_id)) {
        allAllowedAdvisories = false
      }
      if (!allAllowedAdvisories) {
        return true
      }
    }
  })

  return filteredChanges
}
