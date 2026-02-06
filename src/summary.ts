import * as core from '@actions/core'
import {SummaryTableRow} from '@actions/core/lib/summary'
import {InvalidLicenseChanges, InvalidLicenseChangeTypes} from './licenses'
import {Change, Changes, ConfigurationOptions, Scorecard} from './schemas'
import {
  groupDependenciesByManifest,
  getManifestsSet,
  renderUrl,
  octokitClient
} from './utils'

const icons = {
  check: '✅',
  cross: '❌',
  warning: '⚠️'
}

const MAX_SCANNED_FILES_BYTES = 1048576

// Helper to check if a version falls within a vulnerable range
// Supports basic semver comparisons like ">= 8.0.0, <= 8.0.20"
function versionInRange(version: string, range: string): boolean {
  if (!version || !range) return false

  // Parse version into comparable parts
  const vParts = version.split('.').map(p => parseInt(p, 10))

  // Handle range formats like ">= 8.0.0, <= 8.0.20"
  const conditions = range.split(',').map(c => c.trim())

  for (const condition of conditions) {
    const match = condition.match(/([><=]+)\s*(\d+(?:\.\d+)*)/)
    if (!match) continue

    const [, operator, rangeVer] = match
    const rParts = rangeVer.split('.').map(p => parseInt(p, 10))

    // Compare versions part by part
    let cmp = 0
    for (let i = 0; i < Math.max(vParts.length, rParts.length); i++) {
      const v = vParts[i] || 0
      const r = rParts[i] || 0
      if (v > r) {
        cmp = 1
        break
      } else if (v < r) {
        cmp = -1
        break
      }
    }

    // Check if condition is satisfied
    if (operator === '>=' && cmp < 0) return false
    if (operator === '>' && cmp <= 0) return false
    if (operator === '<=' && cmp > 0) return false
    if (operator === '<' && cmp >= 0) return false
    if (operator === '=' && cmp !== 0) return false
  }

  return true
}

function extractPatchVersionId(patchData: unknown): string | null {
  // Handle string format (current API response)
  if (typeof patchData === 'string') return patchData

  // Handle object format with identifier field (for backward compatibility)
  if (patchData && typeof patchData === 'object' && 'identifier' in patchData) {
    const id = (patchData as {identifier: unknown}).identifier
    return typeof id === 'string' ? id : null
  }

  return null
}

// generates the DR report summary and caches it to the Action's core.summary.
// returns the DR summary string, ready to be posted as a PR comment if the
// final DR report is too large
export function addSummaryToSummary(
  vulnerableChanges: Changes,
  invalidLicenseChanges: InvalidLicenseChanges,
  deniedChanges: Changes,
  scorecard: Scorecard,
  config: ConfigurationOptions
): string {
  if (config.deny_licenses && config.deny_licenses.length > 0) {
    addDenyListsDeprecationWarningToSummary()
  }

  const out: string[] = []

  const scorecardWarnings = countScorecardWarnings(scorecard, config)
  const licenseIssues = countLicenseIssues(invalidLicenseChanges)

  core.summary.addHeading('Dependency Review', 1)
  out.push('# Dependency Review')

  if (
    vulnerableChanges.length === 0 &&
    licenseIssues === 0 &&
    deniedChanges.length === 0 &&
    scorecardWarnings === 0
  ) {
    const issueTypes = [
      config.vulnerability_check ? 'vulnerabilities' : '',
      config.license_check ? 'license issues' : '',
      config.show_openssf_scorecard ? 'OpenSSF Scorecard issues' : ''
    ]

    let msg = ''
    if (issueTypes.filter(Boolean).length === 0) {
      msg = `${icons.check} No issues found.`
    } else {
      msg = `${icons.check} No ${issueTypes.filter(Boolean).join(' or ')} found.`
    }

    core.summary.addRaw(msg)
    out.push(msg)
    return out.join('\n')
  }

  const foundIssuesHeader = 'The following issues were found:'
  core.summary.addRaw(foundIssuesHeader)
  out.push(foundIssuesHeader)

  const summaryList: string[] = [
    ...(config.vulnerability_check
      ? [
          `${checkOrFailIcon(vulnerableChanges.length)} ${
            vulnerableChanges.length
          } vulnerable package(s)`
        ]
      : []),
    ...(config.license_check
      ? [
          `${checkOrFailIcon(invalidLicenseChanges.forbidden.length)} ${
            invalidLicenseChanges.forbidden.length
          } package(s) with incompatible licenses`,
          `${checkOrFailIcon(invalidLicenseChanges.unresolved.length)} ${
            invalidLicenseChanges.unresolved.length
          } package(s) with invalid SPDX license definitions`,
          `${checkOrWarnIcon(invalidLicenseChanges.unlicensed.length)} ${
            invalidLicenseChanges.unlicensed.length
          } package(s) with unknown licenses.`
        ]
      : []),
    ...(deniedChanges.length > 0
      ? [
          `${checkOrWarnIcon(deniedChanges.length)} ${
            deniedChanges.length
          } package(s) denied.`
        ]
      : []),
    ...(config.show_openssf_scorecard && scorecardWarnings > 0
      ? [
          `${checkOrWarnIcon(scorecardWarnings)} ${scorecardWarnings ? scorecardWarnings : 'No'} packages with OpenSSF Scorecard issues.`
        ]
      : [])
  ]

  core.summary.addList(summaryList)
  for (const line of summaryList) {
    out.push(`* ${line}`)
  }

  core.summary.addRaw('See the Details below.')
  out.push(
    `\n[View full job summary](${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID})`
  )

  return out.join('\n')
}

function addDenyListsDeprecationWarningToSummary(): void {
  core.summary.addRaw(
    `${icons.warning} <strong>Deprecation Warning</strong>: The <em>deny-licenses</em> option is deprecated for possible removal in the next major release. For more information, see issue 997.`,
    true
  )
}

function countScorecardWarnings(
  scorecard: Scorecard,
  config: ConfigurationOptions
): number {
  return scorecard.dependencies.reduce(
    (total, dependency) =>
      total +
      (dependency.scorecard?.score &&
      dependency.scorecard?.score < config.warn_on_openssf_scorecard_level
        ? 1
        : 0),
    0
  )
}

export async function addChangeVulnerabilitiesToSummary(
  vulnerableChanges: Changes,
  severity: string
): Promise<void> {
  if (vulnerableChanges.length === 0) {
    return
  }

  const rows: SummaryTableRow[] = []
  const manifests = getManifestsSet(vulnerableChanges)

  // Build set of unique advisories to query
  const advisorySet = new Set<string>()
  for (const pkg of vulnerableChanges) {
    for (const vuln of pkg.vulnerabilities) {
      advisorySet.add(vuln.advisory_ghsa_id)
    }
  }

  // Query GitHub API for patch info in parallel
  // Store all vulnerability entries (may be multiple per package with different ranges)
  const patchInfo: Record<
    string,
    {eco: string; pkg: string; range: string; patch: string}[]
  > = {}
  const apiClient = octokitClient()

  await Promise.all(
    Array.from(advisorySet).map(async advId => {
      try {
        core.debug(`Fetching advisory data for ${advId}`)
        const apiResult = await apiClient.request('GET /advisories/{ghsa_id}', {
          ghsa_id: advId
        })

        patchInfo[advId] = []
        const vulnList = apiResult.data.vulnerabilities || []
        core.debug(
          `Found ${vulnList.length} vulnerability entries for ${advId}`
        )

        for (const v of vulnList) {
          if (v.package && v.package.ecosystem) {
            const normalizedEco = v.package.ecosystem.toLowerCase()
            const pkgName = v.package.name || ''
            const vulnRange = v.vulnerable_version_range || ''
            const patchVerId = extractPatchVersionId(v.first_patched_version)
            if (patchVerId) {
              patchInfo[advId].push({
                eco: normalizedEco,
                pkg: pkgName,
                range: vulnRange,
                patch: patchVerId
              })
              core.debug(
                `Added patch info for ${pkgName} (${normalizedEco}): ${patchVerId} for range ${vulnRange}`
              )
            } else {
              core.debug(
                `No patch version found for ${pkgName} (${normalizedEco}) in ${advId}`
              )
            }
          }
        }
      } catch (e) {
        core.debug(`API call failed for ${advId}: ${e}`)
        patchInfo[advId] = []
      }
    })
  )

  core.summary.addHeading('Vulnerabilities', 2)

  for (const manifest of manifests) {
    for (const change of vulnerableChanges.filter(
      pkg => pkg.manifest === manifest
    )) {
      let previous_package = ''
      let previous_version = ''
      for (const vuln of change.vulnerabilities) {
        const sameAsPrevious =
          previous_package === change.name &&
          previous_version === change.version

        // Look up patch version by matching package name, ecosystem, and version range
        let patchVer = 'N/A'
        const advData = patchInfo[vuln.advisory_ghsa_id]
        if (advData && advData.length > 0) {
          const normalizedEco = change.ecosystem.toLowerCase()
          core.debug(
            `Looking up patch for ${change.name}@${change.version} (${normalizedEco}) in ${vuln.advisory_ghsa_id}`
          )
          // Find matching entry by ecosystem, package name, and version range
          const matchingEntry = advData.find(
            entry =>
              entry.eco === normalizedEco &&
              entry.pkg === change.name &&
              versionInRange(change.version, entry.range)
          )
          if (matchingEntry) {
            patchVer = matchingEntry.patch
            core.debug(
              `Found patch version ${patchVer} for ${change.name}@${change.version}`
            )
          } else {
            core.debug(
              `No matching patch found for ${change.name}@${change.version}. Available entries: ${JSON.stringify(advData)}`
            )
          }
        } else {
          core.debug(`No advisory data available for ${vuln.advisory_ghsa_id}`)
        }

        if (!sameAsPrevious) {
          rows.push([
            renderUrl(change.source_repository_url, change.name),
            change.version,
            renderUrl(vuln.advisory_url, vuln.advisory_summary),
            vuln.severity,
            patchVer
          ])
        } else {
          rows.push([
            {data: '', colspan: '2'},
            renderUrl(vuln.advisory_url, vuln.advisory_summary),
            vuln.severity,
            patchVer
          ])
        }
        previous_package = change.name
        previous_version = change.version
      }
    }
    core.summary.addHeading(`<em>${manifest}</em>`, 4).addTable([
      [
        {data: 'Name', header: true},
        {data: 'Version', header: true},
        {data: 'Vulnerability', header: true},
        {data: 'Severity', header: true},
        {data: 'Patched Version', header: true}
      ],
      ...rows
    ])
  }

  if (severity !== 'low') {
    core.summary.addQuote(
      `Only included vulnerabilities with severity <strong>${severity}</strong> or higher.`
    )
  }
}

export function addLicensesToSummary(
  invalidLicenseChanges: InvalidLicenseChanges,
  config: ConfigurationOptions
): void {
  if (countLicenseIssues(invalidLicenseChanges) === 0) {
    return
  }

  core.summary.addHeading('License Issues', 2)
  printLicenseViolations(invalidLicenseChanges)

  if (config.allow_licenses && config.allow_licenses.length > 0) {
    core.summary.addQuote(
      `<details><summary><strong>Allowed Licenses</strong>:</summary> ${config.allow_licenses.join(', ')}</details>`
    )
  }
  if (config.deny_licenses && config.deny_licenses.length > 0) {
    core.summary.addQuote(
      `<details><summary><strong>Denied Licenses</strong>:</summary> ${config.deny_licenses.join(', ')}</details>`
    )
  }
  if (config.allow_dependencies_licenses) {
    core.summary.addQuote(
      `<details><summary><strong>Excluded from license check</strong>:</summary> ${config.allow_dependencies_licenses.join(', ')}</details>`
    )
  }

  core.debug(
    `found ${invalidLicenseChanges.unlicensed.length} unknown licenses`
  )

  core.debug(
    `${invalidLicenseChanges.unresolved.length} licenses could not be validated`
  )
}

const licenseIssueTypes: InvalidLicenseChangeTypes[] = [
  'forbidden',
  'unresolved',
  'unlicensed'
]

const issueTypeNames: Record<InvalidLicenseChangeTypes, string> = {
  forbidden: 'Incompatible License',
  unresolved: 'Invalid SPDX License',
  unlicensed: 'Unknown License'
}

function printLicenseViolations(changes: InvalidLicenseChanges): void {
  const rowsGroupedByManifest: Record<string, SummaryTableRow[]> = {}

  for (const issueType of licenseIssueTypes) {
    for (const change of changes[issueType]) {
      if (!rowsGroupedByManifest[change.manifest]) {
        rowsGroupedByManifest[change.manifest] = []
      }
      rowsGroupedByManifest[change.manifest].push([
        renderUrl(change.source_repository_url, change.name),
        change.version,
        formatLicense(change.license),
        issueTypeNames[issueType]
      ])
    }
  }

  for (const [manifest, rows] of Object.entries(rowsGroupedByManifest)) {
    core.summary.addHeading(`<em>${manifest}</em>`, 4)
    core.summary.addTable([
      ['Package', 'Version', 'License', 'Issue Type'],
      ...rows
    ])
  }
}

function formatLicense(license: string | null): string {
  if (license === null || license === 'NOASSERTION') {
    return 'Null'
  }
  return license
}

export function addScannedFiles(changes: Changes): void {
  const manifests = Array.from(
    groupDependenciesByManifest(changes).keys()
  ).sort()

  let sf_size = 0
  let trunc_at = -1

  for (const [index, entry] of manifests.entries()) {
    if (sf_size + entry.length >= MAX_SCANNED_FILES_BYTES) {
      trunc_at = index
      break
    }
    sf_size += entry.length
  }

  if (trunc_at >= 0) {
    // truncate the manifests list if it will overflow the summary output
    manifests.slice(0, trunc_at)
    // if there's room between cutoff size and list size, add a warning
    const size_diff = MAX_SCANNED_FILES_BYTES - sf_size
    if (size_diff < 12) {
      manifests.push('(truncated)')
    }
  }

  const summary = core.summary.addHeading('Scanned Files', 2)
  if (manifests.length === 0) {
    summary.addRaw('None')
  } else {
    summary.addList(manifests)
  }
}

function snapshotWarningRecommendation(
  config: ConfigurationOptions,
  warnings: string
): string {
  const no_pr_snaps = warnings.includes(
    'No snapshots were found for the head SHA'
  )
  const retries_disabled = !config.retry_on_snapshot_warnings
  if (no_pr_snaps && retries_disabled) {
    return 'Ensure that dependencies are being submitted on PR branches and consider enabling <em>retry-on-snapshot-warnings</em>.'
  } else if (no_pr_snaps) {
    return 'Ensure that dependencies are being submitted on PR branches. Re-running this action after a short time may resolve the issue.'
  } else if (retries_disabled) {
    return 'Consider enabling <em>retry-on-snapshot-warnings</em>.'
  }
  return 'Re-running this action after a short time may resolve the issue.'
}

export function addScorecardToSummary(
  scorecard: Scorecard,
  config: ConfigurationOptions
): void {
  if (scorecard.dependencies.length === 0) {
    return
  }
  core.summary.addHeading('OpenSSF Scorecard', 2)
  if (scorecard.dependencies.length > 10) {
    core.summary.addRaw(`<details><summary>Scorecard details</summary>`, true)
  }
  core.summary.addRaw(
    `<table><tr><th>Package</th><th>Version</th><th>Score</th><th>Details</th></tr>`,
    true
  )
  for (const dependency of scorecard.dependencies) {
    core.debug('Adding scorecard to summary')
    core.debug(`Overall score ${dependency.scorecard?.score}`)

    // Set the icon based on the overall score value
    let overallIcon = ''
    if (dependency.scorecard?.score) {
      overallIcon =
        dependency.scorecard?.score < config.warn_on_openssf_scorecard_level
          ? ':warning:'
          : ':green_circle:'
    }

    //Add a row for the dependency
    core.summary.addRaw(
      `<tr><td>${dependency.change.source_repository_url ? `<a href="${dependency.change.source_repository_url}">` : ''} ${dependency.change.ecosystem}/${dependency.change.name} ${dependency.change.source_repository_url ? `</a>` : ''}</td><td>${dependency.change.version}</td>
      <td>${overallIcon} ${dependency.scorecard?.score === undefined || dependency.scorecard?.score === null ? 'Unknown' : dependency.scorecard?.score}</td>`,
      false
    )

    //Add details table in the last column
    if (dependency.scorecard?.checks !== undefined) {
      let detailsTable =
        '<table><tr><th>Check</th><th>Score</th><th>Reason</th></tr>'
      for (const check of dependency.scorecard?.checks || []) {
        const icon =
          parseFloat(check.score) < config.warn_on_openssf_scorecard_level
            ? ':warning:'
            : ':green_circle:'

        detailsTable += `<tr><td>${check.name}</td><td>${icon} ${check.score}</td><td>${check.reason}</td></tr>`
      }
      detailsTable += `</table>`
      core.summary.addRaw(
        `<td><details><summary>Details</summary>${detailsTable}</details></td></tr>`,
        true
      )
    } else {
      core.summary.addRaw('<td>Unknown</td></tr>', true)
    }
  }
  core.summary.addRaw(`</table>`)
  if (scorecard.dependencies.length > 10) {
    core.summary.addRaw(`</details>`)
  }
}

export function addSnapshotWarnings(
  config: ConfigurationOptions,
  warnings: string
): void {
  core.summary.addHeading('Snapshot Warnings', 2)
  core.summary.addQuote(`${icons.warning}: ${warnings}`)
  const recommendation = snapshotWarningRecommendation(config, warnings)
  const docsLink =
    'See <a href="https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/about-dependency-review#best-practices-for-using-the-dependency-review-api-and-the-dependency-submission-api-together">the documentation</a> for more information and troubleshooting advice.'
  core.summary.addRaw(`${recommendation} ${docsLink}`)
}

function countLicenseIssues(
  invalidLicenseChanges: InvalidLicenseChanges
): number {
  return Object.values(invalidLicenseChanges).reduce(
    (acc, val) => acc + val.length,
    0
  )
}

export function addDeniedToSummary(deniedChanges: Change[]): void {
  if (deniedChanges.length === 0) {
    return
  }

  core.summary.addHeading('Denied dependencies', 2)
  for (const change of deniedChanges) {
    core.summary.addHeading(`<em>Denied dependencies</em>`, 4)
    core.summary.addTable([
      ['Package', 'Version', 'License'],
      [
        renderUrl(change.source_repository_url, change.name),
        change.version,
        change.license || ''
      ]
    ])
  }
}

function checkOrFailIcon(count: number): string {
  return count === 0 ? icons.check : icons.cross
}

function checkOrWarnIcon(count: number): string {
  return count === 0 ? icons.check : icons.warning
}
