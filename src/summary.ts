import * as core from '@actions/core'
import {ConfigurationOptions, Changes} from './schemas'
import {SummaryTableRow} from '@actions/core/lib/summary'
import {groupDependenciesByManifest, getManifestsSet, renderUrl} from './utils'

export function addSummaryToSummary(
  addedPackages: Changes,
  invalidLicenseChanges: Record<string, Changes>
): void {
  core.summary
    .addHeading('Dependency Review')
    .addRaw('We found:')
    .addList([
      `${addedPackages.length} vulnerable package(s)`,
      `${invalidLicenseChanges.unresolved.length} package(s) with unprocessable licenses`,
      `${invalidLicenseChanges.forbidden.length} package(s) with incompatible licenses and`,
      `${invalidLicenseChanges.unlicensed.length} package(s) with unknown licenses.`
    ])
}

export function addChangeVulnerabilitiesToSummary(
  addedPackages: Changes,
  severity: string
): void {
  const rows: SummaryTableRow[] = []

  const manifests = getManifestsSet(addedPackages)

  core.summary
    .addHeading('Vulnerabilities')
    .addQuote(
      `Vulnerabilites were filtered by mininum severity <strong>${severity}</strong>.`
    )

  if (addedPackages.length === 0) {
    core.summary.addQuote('No vulnerabilities found in added packages.')
    return
  }

  for (const manifest of manifests) {
    for (const change of addedPackages.filter(
      pkg => pkg.manifest === manifest
    )) {
      let previous_package = ''
      let previous_version = ''
      for (const vuln of change.vulnerabilities) {
        const sameAsPrevious =
          previous_package === change.name &&
          previous_version === change.version

        if (!sameAsPrevious) {
          rows.push([
            renderUrl(change.source_repository_url, change.name),
            change.version,
            renderUrl(vuln.advisory_url, vuln.advisory_summary),
            vuln.severity
          ])
        } else {
          rows.push([
            {data: '', colspan: '2'},
            renderUrl(vuln.advisory_url, vuln.advisory_summary),
            vuln.severity
          ])
        }
        previous_package = change.name
        previous_version = change.version
      }
    }
    core.summary.addHeading(`<em>${manifest}</em>`, 3).addTable([
      [
        {data: 'Name', header: true},
        {data: 'Version', header: true},
        {data: 'Vulnerability', header: true},
        {data: 'Severity', header: true}
      ],
      ...rows
    ])
  }
}

export function addLicensesToSummary(
  invalidLicenseChanges: Record<string, Changes>,
  config: ConfigurationOptions
): void {
  core.summary.addHeading('Licenses')

  if (config.allow_licenses && config.allow_licenses.length > 0) {
    core.summary.addQuote(
      `<strong>Allowed Licenses</strong>: ${config.allow_licenses.join(', ')}`
    )
  }
  if (config.deny_licenses && config.deny_licenses.length > 0) {
    core.summary.addQuote(
      `<strong>Denied Licenses</strong>: ${config.deny_licenses.join(', ')}`
    )
  }

  if (
    invalidLicenseChanges.forbidden.length === 0 &&
    invalidLicenseChanges.unlicensed.length === 0
  ) {
    core.summary.addQuote('No license violations detected.')
    return
  }

  if (invalidLicenseChanges.forbidden.length > 0) {
    const rows: SummaryTableRow[] = []
    const manifests = getManifestsSet(invalidLicenseChanges.forbidden)

    core.summary.addHeading('Incompatible Licenses', 3).addSeparator()

    for (const manifest of manifests) {
      core.summary.addHeading(`<em>${manifest}</em>`, 4)

      for (const change of invalidLicenseChanges.forbidden.filter(
        pkg => pkg.manifest === manifest
      )) {
        rows.push([
          renderUrl(change.source_repository_url, change.name),
          change.version,
          change.license || ''
        ])
      }
      core.summary.addTable([['Package', 'Version', 'License'], ...rows])
    }
  } else {
    core.summary.addQuote('No incompatible license detected.')
  }

  core.debug(
    `found ${invalidLicenseChanges.unlicensed.length} unknown licenses`
  )

  if (invalidLicenseChanges.unlicensed.length > 0) {
    const rows: SummaryTableRow[] = []
    const manifests = getManifestsSet(invalidLicenseChanges.unlicensed)

    core.debug(
      `found ${manifests.entries.length} manifests for unknown licenses`
    )

    core.summary.addHeading('Unknown Licenses', 3).addSeparator()

    for (const manifest of manifests) {
      core.summary.addHeading(`<em>${manifest}</em>`, 4)

      for (const change of invalidLicenseChanges.unlicensed.filter(
        pkg => pkg.manifest === manifest
      )) {
        rows.push([
          renderUrl(change.source_repository_url, change.name),
          change.version
        ])
      }

      core.summary.addTable([['Package', 'Version'], ...rows])
    }
  }
}

export function addScannedDependencies(changes: Changes): void {
  const dependencies = groupDependenciesByManifest(changes)
  const manifests = dependencies.keys()

  const summary = core.summary
    .addHeading('Scanned Dependencies')
    .addHeading(`We scanned ${dependencies.size} manifest files:`, 'title')

  for (const manifest of manifests) {
    const deps = dependencies.get(manifest)
    if (deps) {
      const dependencyNames = deps.map(
        dependency => `<li>${dependency.name}@${dependency.version}</li>`
      )
      summary.addDetails(manifest, `<ul>${dependencyNames.join('')}</ul>`)
    }
  }
}
