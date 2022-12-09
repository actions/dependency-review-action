import * as core from '@actions/core'
import {ConfigurationOptions, Changes} from './schemas'
import {SummaryTableRow} from '@actions/core/lib/summary'
import {groupDependenciesByManifest, getManifestsSet, renderUrl} from './utils'

export function addSummaryToSummary(
  addedPackages: Changes | null,
  invalidLicenseChanges: Record<string, Changes> | null
): void {
  core.summary
    .addHeading('Dependency Review')
    .addRaw('We found:')
    .addList([
      ...(addedPackages
        ? [`${addedPackages.length} vulnerable package(s)`]
        : []),
      ...(invalidLicenseChanges
        ? [
            `${invalidLicenseChanges.unresolved.length} package(s) with invalid SPDX license definitions`,
            `${invalidLicenseChanges.forbidden.length} package(s) with incompatible licenses`,
            `${invalidLicenseChanges.unlicensed.length} package(s) with unknown licenses.`
          ]
        : [])
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
      `Vulnerabilities were filtered by minimum severity <strong>${severity}</strong>.`
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

  if (Object.values(invalidLicenseChanges).every(item => item.length === 0)) {
    core.summary.addQuote('No license violations detected.')
    return
  }

  core.debug(
    `found ${invalidLicenseChanges.unlicensed.length} unknown licenses`
  )

  core.debug(
    `${invalidLicenseChanges.unresolved.length} licenses could not be validated`
  )

  printLicenseViolation(
    'Incompatible Licenses',
    invalidLicenseChanges.forbidden
  )
  printLicenseViolation('Unknown Licenses', invalidLicenseChanges.unlicensed)
  printLicenseViolation(
    'Invalid SPDX License Definitions',
    invalidLicenseChanges.unresolved
  )
}
function printLicenseViolation(heading: string, changes: Changes): void {
  core.summary.addHeading(heading, 5).addSeparator()

  if (changes.length > 0) {
    const rows: SummaryTableRow[] = []
    const manifests = getManifestsSet(changes)

    for (const manifest of manifests) {
      core.summary.addHeading(`<em>${manifest}</em>`, 4)

      for (const change of changes.filter(pkg => pkg.manifest === manifest)) {
        rows.push([
          renderUrl(change.source_repository_url, change.name),
          change.version,
          formatLicense(change.license)
        ])
      }

      core.summary.addTable([['Package', 'Version', 'License'], ...rows])
    }
  } else {
    core.summary.addQuote(`No ${heading.toLowerCase()} detected.`)
  }
}

function formatLicense(license: string | null): string {
  if (license === null || license === 'NOASSERTION') {
    return 'Null'
  }
  return license
}

export function addScannedDependencies(changes: Changes): void {
  const dependencies = groupDependenciesByManifest(changes)
  const manifests = dependencies.keys()

  const summary = core.summary
    .addHeading('Scanned Dependencies')
    .addHeading(`We scanned ${dependencies.size} manifest files:`, 5)

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
