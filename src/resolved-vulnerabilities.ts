import {
  Changes,
  ResolvedVulnerabilities,
  ResolvedVulnerability
} from './schemas'

/**
 * Extract resolved vulnerabilities from removed dependencies.
 * A vulnerability is considered "resolved" only if the advisory no longer
 * appears on any added dependency in the same ecosystem/manifest/package.
 * This avoids false positives during upgrades where the old version is removed
 * but the same advisory still affects the newly added version.
 *
 * @param changes - All dependency changes (added and removed)
 * @returns Array of resolved vulnerabilities
 */
export function getResolvedVulnerabilities(
  changes: Changes
): ResolvedVulnerabilities {
  const resolvedVulns: ResolvedVulnerabilities = []

  // Collect all advisory IDs that still exist on added/non-removed changes
  const activeAdvisoryIds = new Set<string>()
  for (const change of changes) {
    if (change.change_type !== 'removed' && change.vulnerabilities) {
      for (const vuln of change.vulnerabilities) {
        activeAdvisoryIds.add(vuln.advisory_ghsa_id)
      }
    }
  }

  // Filter for removed dependencies that have vulnerabilities
  const removedChangesWithVulns = changes.filter(
    change =>
      change.change_type === 'removed' &&
      change.vulnerabilities &&
      change.vulnerabilities.length > 0
  )

  // Only include vulnerabilities whose advisory is NOT still present in added deps
  for (const removedChange of removedChangesWithVulns) {
    for (const vulnerability of removedChange.vulnerabilities || []) {
      if (activeAdvisoryIds.has(vulnerability.advisory_ghsa_id)) {
        continue
      }
      const resolvedVuln: ResolvedVulnerability = {
        severity: vulnerability.severity,
        advisory_ghsa_id: vulnerability.advisory_ghsa_id,
        advisory_summary: vulnerability.advisory_summary,
        advisory_url: vulnerability.advisory_url,
        package_name: removedChange.name,
        package_version: removedChange.version,
        package_url: removedChange.package_url,
        manifest: removedChange.manifest,
        ecosystem: removedChange.ecosystem
      }
      resolvedVulns.push(resolvedVuln)
    }
  }

  return resolvedVulns
}
