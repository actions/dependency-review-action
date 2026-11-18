import * as core from '@actions/core'
import * as dependencyGraph from './dependency-graph'
import * as github from '@actions/github'
import styles from 'ansi-styles'
import {RequestError} from '@octokit/request-error'
import {
  Change,
  Severity,
  Changes,
  ConfigurationOptions,
  Scorecard,
  VulnerabilityCooldowns
} from './schemas'
import {readConfig} from '../src/config'
import {
  filterChangesBySeverity,
  filterChangesByScopes,
  filterAllowedAdvisories
} from '../src/filter'
import {getInvalidLicenseChanges} from './licenses'
import {getScorecardLevels} from './scorecard'
import * as summary from './summary'
import {getRefs} from './git-refs'

import {groupDependenciesByManifest} from './utils'
import {commentPr, MAX_COMMENT_LENGTH} from './comment-pr'
import {getDeniedChanges} from './deny'
import {getVulnerabilityCooldowns} from './vulnerability-cooldown'
import {DefaultArtifactClient} from '@actions/artifact'
import * as fs from 'fs'

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function getComparison(
  baseRef: string,
  headRef: string,
  retryOpts?: {
    retryUntil: number
    retryDelay: number
  }
): ReturnType<typeof dependencyGraph.compare> {
  const comparison = await dependencyGraph.compare({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    baseRef,
    headRef
  })

  if (comparison.snapshot_warnings.trim() !== '') {
    core.info(comparison.snapshot_warnings)
    if (retryOpts !== undefined) {
      if (retryOpts.retryUntil < Date.now()) {
        core.info(`Retry timeout exceeded. Proceeding...`)
        return comparison
      } else {
        core.info(`Retrying in ${retryOpts.retryDelay} seconds...`)
        await delay(retryOpts.retryDelay * 1000)
        return getComparison(baseRef, headRef, retryOpts)
      }
    }
  }

  return comparison
}

export async function handleLargeSummary(
  summaryContent: string
): Promise<string> {
  const MAX_SUMMARY_SIZE = 1024 * 1024 // 1024k in bytes
  if (Buffer.byteLength(summaryContent, 'utf8') <= MAX_SUMMARY_SIZE) {
    return summaryContent
  }

  const summarySize = Math.round(
    Buffer.byteLength(summaryContent, 'utf8') / 1024
  )
  const truncatedSummary = `# Dependency Review Summary

The full dependency review summary was too large to display here (${summarySize}KB, limit is 1024KB).`

  const artifactClient = new DefaultArtifactClient()
  const artifactName = 'dependency-review-summary'
  const files = ['summary.md']

  try {
    // Write the summary to a file
    await fs.promises.writeFile('summary.md', summaryContent)

    // Upload the artifact
    await artifactClient.uploadArtifact(artifactName, files, '.', {
      retentionDays: 1
    })

    // Return a shorter summary with a link to the artifact
    const shortSummary = `${truncatedSummary}

Please download the artifact named "${artifactName}" to view the complete report.

[View full job summary](${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID})`

    // Set core.summary to the shorter summary value to avoid exceeding MAX_SUMMARY_SIZE
    core.summary.emptyBuffer()
    core.summary.addRaw(shortSummary)
    return shortSummary
  } catch (error) {
    core.warning(
      `Failed to upload large summary as artifact: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
    // Even though artifact upload failed, we must still replace the buffer
    // with a truncated summary to prevent core.summary.write() from failing
    // with the oversized content (see issue #867)
    core.summary.emptyBuffer()
    core.summary.addRaw(truncatedSummary)
    return truncatedSummary
  }
}

export async function run(): Promise<void> {
  try {
    const config = await readConfig()

    const refs = getRefs(config, github.context)

    const comparison = await getComparison(
      refs.base,
      refs.head,
      config.retry_on_snapshot_warnings
        ? {
            retryUntil:
              Date.now() + config.retry_on_snapshot_warnings_timeout * 1000,
            retryDelay: 10
          }
        : undefined
    )

    const changes = comparison.changes
    const snapshot_warnings = comparison.snapshot_warnings

    if (!changes) {
      core.info('No Dependency Changes found. Skipping Dependency Review.')
      return
    }

    const scopedChanges = filterChangesByScopes(config.fail_on_scopes, changes)

    const filteredChanges = filterAllowedAdvisories(
      config.allow_ghsas,
      scopedChanges
    )

    const failOnSeverityParams = config.fail_on_severity
    const warnOnly = config.warn_only
    let minSeverity: Severity = 'low'
    // If failOnSeverityParams is not set or warnOnly is true, the minSeverity is low, to allow all vulnerabilities to be reported as warnings
    if (failOnSeverityParams && !warnOnly) {
      minSeverity = failOnSeverityParams
    }

    const vulnerableChanges = filterChangesBySeverity(
      minSeverity,
      filteredChanges
    )
    const cooldowns: VulnerabilityCooldowns =
      config.vulnerability_check && !warnOnly
        ? await getVulnerabilityCooldowns(
            vulnerableChanges,
            config.warn_on_vulnerability_cooldown
          )
        : new Map()

    const invalidLicenseChanges = await getInvalidLicenseChanges(
      filteredChanges,
      {
        allow: config.allow_licenses,
        deny: config.deny_licenses,
        licenseExclusions: config.allow_dependencies_licenses
      }
    )

    core.debug(`Filtered Changes: ${JSON.stringify(filteredChanges)}`)
    core.debug(`Config Deny Packages: ${JSON.stringify(config)}`)

    const deniedChanges = await getDeniedChanges(
      filteredChanges,
      config.deny_packages,
      config.deny_groups
    )

    // generate informational scorecard entries for all added changes in the PR
    let scorecard: Scorecard = {dependencies: []}
    if (config.show_openssf_scorecard) {
      const scorecardChanges = getScorecardChanges(changes)
      scorecard = await getScorecardLevels(scorecardChanges)
    }

    let issueFound = false
    if (config.vulnerability_check) {
      issueFound = await printVulnerabilitiesBlock(
        vulnerableChanges,
        minSeverity,
        warnOnly,
        cooldowns
      )
    }

    const minSummary = summary.addSummaryToSummary(
      vulnerableChanges,
      invalidLicenseChanges,
      deniedChanges,
      scorecard,
      config,
      cooldowns
    )

    if (snapshot_warnings) {
      summary.addSnapshotWarnings(config, snapshot_warnings)
    }

    if (config.vulnerability_check) {
      core.setOutput('vulnerable-changes', JSON.stringify(vulnerableChanges))
      await summary.addChangeVulnerabilitiesToSummary(
        vulnerableChanges,
        minSeverity,
        config.show_patched_versions,
        cooldowns
      )
    }
    if (config.license_check) {
      core.setOutput(
        'invalid-license-changes',
        JSON.stringify(invalidLicenseChanges)
      )
      summary.addLicensesToSummary(invalidLicenseChanges, config)
      issueFound ||= await printLicensesBlock(invalidLicenseChanges, warnOnly)
    }
    if (config.deny_packages || config.deny_groups) {
      core.setOutput('denied-changes', JSON.stringify(deniedChanges))
      summary.addDeniedToSummary(deniedChanges)
      issueFound ||= await printDeniedDependencies(deniedChanges, config)
    }
    if (config.show_openssf_scorecard) {
      summary.addScorecardToSummary(scorecard, config)
      printScorecardBlock(scorecard, config)
      createScorecardWarnings(scorecard, config)
    }

    core.setOutput('dependency-changes', JSON.stringify(changes))
    summary.addScannedFiles(changes)
    printScannedDependencies(changes)

    // include full summary in output; Actions will truncate if oversized
    let rendered = core.summary.stringify()
    core.setOutput('comment-content', rendered)

    // Handle large summaries by uploading as artifact
    rendered = await handleLargeSummary(rendered)

    // if the summary is oversized, replace with minimal version
    if (rendered.length >= MAX_COMMENT_LENGTH) {
      core.debug(
        'The comment was too big for the GitHub API. Falling back on a minimum comment'
      )
      rendered = minSummary
    }

    // update the PR comment if needed with the right-sized summary
    await commentPr(rendered, config, issueFound)
  } catch (error) {
    if (error instanceof RequestError && error.status === 404) {
      core.setFailed(
        `Dependency review could not obtain dependency data for the specified owner, repository, or revision range.`
      )
    } else {
      if (error instanceof Error) {
        core.setFailed(error.message)
      } else {
        core.setFailed('Unexpected fatal error')
      }
    }
  } finally {
    try {
      await core.summary.write()
    } catch (error) {
      core.warning(
        `Failed to write job summary: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}

async function printVulnerabilitiesBlock(
  addedChanges: Changes,
  minSeverity: Severity,
  warnOnly: boolean,
  cooldowns: VulnerabilityCooldowns
): Promise<boolean> {
  return core.group('Vulnerabilities', async () => {
    // Take one enforcement snapshot for both the job result and the summary.
    const now = Date.now()
    for (const [change, advisories] of cooldowns) {
      for (const [id, until] of advisories) {
        if (Date.parse(until) <= now) advisories.delete(id)
      }
      if (!advisories.size) cooldowns.delete(change)
    }
    let vulnFound = false

    for (const change of addedChanges) {
      vulnFound =
        printChangeVulnerabilities(change, cooldowns.get(change)) || vulnFound
    }

    if (vulnFound) {
      const msg = 'Dependency review detected vulnerable packages.'
      if (warnOnly) {
        core.warning(msg)
      } else {
        core.setFailed(msg)
      }
    } else if (addedChanges.length === 0) {
      core.info(
        `Dependency review did not detect any vulnerable packages with severity level "${minSeverity}" or higher.`
      )
    }

    return vulnFound
  })
}

function printChangeVulnerabilities(
  change: Change,
  cooldowns: Map<string, string> | undefined
): boolean {
  let blocking = false
  for (const vuln of change.vulnerabilities) {
    core.info(
      `${styles.bold.open}${change.manifest} » ${change.name}@${
        change.version
      }${styles.bold.close} – ${vuln.advisory_summary} ${renderSeverity(
        vuln.severity
      )}`
    )
    core.info(`  ↪ ${vuln.advisory_url}`)
    const until = cooldowns?.get(vuln.advisory_ghsa_id)
    if (until) {
      core.warning(
        `${change.name}@${change.version} (${vuln.advisory_ghsa_id}) is temporarily warning-only until ${until} under warn-on-vulnerability-cooldown.`
      )
    } else {
      blocking = true
    }
  }
  return blocking
}

async function printLicensesBlock(
  invalidLicenseChanges: Record<string, Changes>,
  warnOnly: boolean
): Promise<boolean> {
  return core.group('Licenses', async () => {
    let issueFound = false

    if (invalidLicenseChanges.forbidden.length > 0) {
      issueFound = true
      core.info('\nThe following dependencies have incompatible licenses:')
      printLicensesError(invalidLicenseChanges.forbidden)
      const msg = 'Dependency review detected incompatible licenses.'
      if (warnOnly) {
        core.warning(msg)
      } else {
        core.setFailed(msg)
      }
    }
    if (invalidLicenseChanges.unresolved.length > 0) {
      issueFound = true
      core.warning(
        '\nThe validity of the licenses of the dependencies below could not be determined. Ensure that they are valid SPDX licenses:'
      )
      printLicensesError(invalidLicenseChanges.unresolved)
      core.setFailed(
        'Dependency review could not detect the validity of all licenses.'
      )
    }
    printNullLicenses(invalidLicenseChanges.unlicensed)

    return issueFound
  })
}

function printLicensesError(changes: Changes): void {
  for (const change of changes) {
    core.info(
      `${styles.bold.open}${change.manifest} » ${change.name}@${change.version}${styles.bold.close} – License: ${styles.color.red.open}${change.license}${styles.color.red.close}`
    )
  }
}

function printNullLicenses(changes: Changes): void {
  if (changes.length === 0) {
    return
  }

  core.info('\nWe could not detect a license for the following dependencies:')
  for (const change of changes) {
    core.info(
      `${styles.bold.open}${change.manifest} » ${change.name}@${change.version}${styles.bold.close}`
    )
  }
}

function printScorecardBlock(
  scorecard: Scorecard,
  config: ConfigurationOptions
): void {
  core.group('Scorecard', async () => {
    if (scorecard) {
      for (const dependency of scorecard.dependencies) {
        if (
          dependency.scorecard?.score &&
          dependency.scorecard?.score < config.warn_on_openssf_scorecard_level
        ) {
          core.info(
            `${styles.color.red.open}${dependency.change.ecosystem}/${dependency.change.name}: OpenSSF Scorecard Score: ${dependency?.scorecard?.score}${styles.red.close}`
          )
        }
        core.info(
          `${dependency.change.ecosystem}/${dependency.change.name}: OpenSSF Scorecard Score: ${dependency?.scorecard?.score}`
        )
      }
    }
  })
}

function renderSeverity(
  severity: 'critical' | 'high' | 'moderate' | 'low'
): string {
  const color = (
    {
      critical: 'red',
      high: 'red',
      moderate: 'yellow',
      low: 'grey'
    } as const
  )[severity]
  return `${styles.color[color].open}(${severity} severity)${styles.color[color].close}`
}

function renderScannedDependency(change: Change): string {
  const changeType: string = change.change_type

  if (changeType !== 'added' && changeType !== 'removed') {
    throw new Error(`Unexpected change type: ${changeType}`)
  }

  const color = (
    {
      added: 'green',
      removed: 'red'
    } as const
  )[changeType]

  const icon = (
    {
      added: '+',
      removed: '-'
    } as const
  )[changeType]

  return `${styles.color[color].open}${icon} ${change.name}@${change.version}${styles.color[color].close}`
}

function printScannedDependencies(changes: Changes): void {
  core.group('Dependency Changes', async () => {
    const dependencies = groupDependenciesByManifest(changes)

    for (const manifestName of dependencies.keys()) {
      const manifestChanges = dependencies.get(manifestName) || []
      core.info(`File: ${styles.bold.open}${manifestName}${styles.bold.close}`)
      for (const change of manifestChanges) {
        core.info(`${renderScannedDependency(change)}`)
      }
    }
  })
}

async function printDeniedDependencies(
  changes: Changes,
  config: ConfigurationOptions
): Promise<boolean> {
  return core.group('Denied', async () => {
    let issueFound = false

    for (const denied of config.deny_packages) {
      core.info(`Config: ${denied}`)
    }

    for (const change of changes) {
      core.info(`Change: ${change.name}@${change.version} is denied`)
      core.info(`Change: ${change.package_url} is denied`)
    }

    if (changes.length > 0) {
      issueFound = true
      core.setFailed('Dependency review detected denied packages.')
    } else {
      core.info('Dependency review did not detect any denied packages')
    }

    return issueFound
  })
}

function getScorecardChanges(changes: Changes): Changes {
  const out: Changes = []
  for (const change of changes) {
    if (change.change_type === 'added') {
      out.push(change)
    }
  }

  return out
}

async function createScorecardWarnings(
  scorecards: Scorecard,
  config: ConfigurationOptions
): Promise<void> {
  // Iterate through the list of scorecards, and if the score is less than the threshold, send a warning
  for (const dependency of scorecards.dependencies) {
    if (
      dependency.scorecard?.score &&
      dependency.scorecard?.score < config.warn_on_openssf_scorecard_level
    ) {
      core.warning(
        `${dependency.change.ecosystem}/${dependency.change.name} has an OpenSSF Scorecard of ${dependency.scorecard?.score}, which is less than this repository's threshold of ${config.warn_on_openssf_scorecard_level}.`,
        {
          title: 'OpenSSF Scorecard Warning'
        }
      )
    }
  }
}

run()
