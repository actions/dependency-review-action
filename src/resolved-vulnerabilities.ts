import {Changes, ResolvedVulnerabilities, ResolvedVulnerability} from './schemas'

/**
 * Extract resolved vulnerabilities from removed dependencies
 * These are vulnerabilities that were present in the base but are no longer present in the head
 * 
 * @param changes - All dependency changes (added and removed)
 * @returns Array of resolved vulnerabilities
 */
export function getResolvedVulnerabilities(changes: Changes): ResolvedVulnerabilities {
  const resolvedVulns: ResolvedVulnerabilities = []
  
  // Filter for removed dependencies that have vulnerabilities
  const removedChangesWithVulns = changes.filter(
    change => change.change_type === 'removed' && 
              change.vulnerabilities && 
              change.vulnerabilities.length > 0
  )
  
  // Convert each vulnerability on removed packages to a resolved vulnerability
  for (const removedChange of removedChangesWithVulns) {
    for (const vulnerability of removedChange.vulnerabilities || []) {
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