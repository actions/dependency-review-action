import {Changes} from './schemas'
import {Severity, SEVERITIES} from './schemas'

export function filterChangesBySeverity(
  severity: Severity,
  changes: Changes
): Changes {
  const severityIdx = SEVERITIES.indexOf(severity)

  for (let change of changes) {
    if (
      change === undefined ||
      change.vulnerabilities === undefined ||
      change.vulnerabilities.length === 0
    ) {
      continue
    }
    change.vulnerabilities = change.vulnerabilities.filter(vuln => {
      const vulnIdx = SEVERITIES.indexOf(vuln.severity)
      if (vulnIdx <= severityIdx) {
        return true
      }
    })
  }

  // don't want to deal with changes with no vulnerabilities
  let filteredChanges = changes.filter(
    change => change.vulnerabilities.length > 0
  )
  return filteredChanges
}
