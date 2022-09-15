import {Changes, Severity, SEVERITIES, Scope, SCOPES} from './schemas'

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
    if (scopes.indexOf(change.scope) > -1) {
      return true
    }
  })

  return filteredChanges
}
