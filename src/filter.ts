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
  scopes: Scope[],
  changes: Changes
): Changes {
  const filteredChanges = changes.filter(change => {
    // if there is no scope on the change (Enterprise Server API for now), we will assume it is a runtime scope
    const scope = change.scope || 'runtime'
    return scopes.includes(scope)
  })

  return filteredChanges
}
