import * as core from '@actions/core'
import {ConfigurationOptions, Change, Changes} from './schemas'
import {SummaryTableRow} from '@actions/core/lib/summary'

export function addSummaryToSummary(
  addedPackages: Changes,
  licenseErrors: Change[],
  unknownLicenses: Change[]
): void {
  core.summary
    .addHeading('Dependency Review')
    .addRaw(
      `We found ${addedPackages.length} vulnerable package(s), ${licenseErrors.length} package()s with incompatible licenses, and ${unknownLicenses.length} package(s) with unknown licenses.`
    )
}

export function addChangeVulnerabilitiesToSummary(
  addedPackages: Changes,
  severity: string
): void {
  const rows: SummaryTableRow[] = []

  const manifests = getManifests(addedPackages)

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
  licenseErrors: Change[],
  unknownLicenses: Change[],
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

  if (licenseErrors.length === 0 && unknownLicenses.length === 0) {
    core.summary.addQuote('No license violations detected.')
    return
  }

  if (licenseErrors.length > 0) {
    const rows: SummaryTableRow[] = []
    const manifests = getManifests(licenseErrors)

    core.summary.addHeading('Incompatible Licenses', 3).addSeparator()

    for (const manifest of manifests) {
      core.summary.addHeading(`<em>${manifest}</em>`, 4)

      for (const change of licenseErrors.filter(
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
    core.summary.addQuote('No license violations detected.')
  }

  core.debug(`found ${unknownLicenses.length} unknown licenses`)

  if (unknownLicenses.length > 0) {
    const rows: SummaryTableRow[] = []
    const manifests = getManifests(unknownLicenses)

    core.debug(
      `found ${manifests.entries.length} manifests for unknown licenses`
    )

    core.summary.addHeading('Unknown Licenses', 3).addSeparator()

    for (const manifest of manifests) {
      core.summary.addHeading(`<em>${manifest}</em>`, 4)

      for (const change of unknownLicenses.filter(
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

function getManifests(changes: Changes): Set<string> {
  return new Set(changes.flatMap(c => c.manifest))
}

function renderUrl(url: string | null, text: string): string {
  if (url) {
    return `<a href="${url}">${text}</a>`
  } else {
    return text
  }
}
