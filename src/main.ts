import * as core from '@actions/core'
import * as dependencyGraph from './dependency-graph'
import * as github from '@actions/github'
import styles from 'ansi-styles'
import {RequestError} from '@octokit/request-error'
import {Change, Severity, Changes, ConfigurationOptions} from './schemas'
import {readConfig} from '../src/config'
import {
  filterChangesBySeverity,
  filterChangesByScopes,
  filterAllowedAdvisories
} from '../src/filter'
import {getInvalidLicenseChanges} from './licenses'
import * as summary from './summary'
import {getRefs} from './git-refs'

import {groupDependenciesByManifest} from './utils'
import {commentPr} from './comment-pr'
import {getDeniedChanges} from './deny'

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

async function run(): Promise<void> {
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

    const minSeverity = config.fail_on_severity
    const scopedChanges = filterChangesByScopes(config.fail_on_scopes, changes)
    const filteredChanges = filterChangesBySeverity(
      minSeverity,
      scopedChanges
    ).filter(
      change =>
        change.change_type === 'added' &&
        change.vulnerabilities !== undefined &&
        change.vulnerabilities.length > 0
    )

    const vulnerableChanges = filterAllowedAdvisories(
      config.allow_ghsas,
      filteredChanges
    )
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
    core.debug(`Vulnerable Changes: ${vulnerableChanges}`)

    const deniedChanges = await getDeniedChanges(
      filteredChanges,
      config.deny_packages,
      config.deny_groups
    )

    summary.addSummaryToSummary(
      vulnerableChanges,
      invalidLicenseChanges,
      deniedChanges,
      config
    )

    if (snapshot_warnings) {
      summary.addSnapshotWarnings(config, snapshot_warnings)
    }

    if (config.vulnerability_check) {
      summary.addChangeVulnerabilitiesToSummary(vulnerableChanges, minSeverity)
      printVulnerabilitiesBlock(vulnerableChanges, minSeverity)
    }
    if (config.license_check) {
      summary.addLicensesToSummary(invalidLicenseChanges, config)
      printLicensesBlock(invalidLicenseChanges)
    }
    if (config.deny_packages || config.deny_groups) {
      summary.addDeniedToSummary(deniedChanges)
      printDeniedDependencies(deniedChanges, config)
    }

    summary.addScannedDependencies(changes)
    printScannedDependencies(changes)
    if (
      config.comment_summary_in_pr === 'always' ||
      (config.comment_summary_in_pr === 'on-failure' &&
        process.exitCode === core.ExitCode.Failure)
    ) {
      await commentPr(core.summary)
    }
  } catch (error) {
    if (error instanceof RequestError && error.status === 404) {
      core.setFailed(
        `Dependency review could not obtain dependency data for the specified owner, repository, or revision range.`
      )
    } else if (error instanceof RequestError && error.status === 403) {
      core.setFailed(
        `Dependency review is not supported on this repository. Please ensure that Dependency graph is enabled along with GitHub Advanced Security on private repositories, see https://github.com/${github.context.repo.owner}/${github.context.repo.repo}/settings/security_analysis`
      )
    } else {
      if (error instanceof Error) {
        core.setFailed(error.message)
      } else {
        core.setFailed('Unexpected fatal error')
      }
    }
  } finally {
    await core.summary.write()
  }
}

function printVulnerabilitiesBlock(
  addedChanges: Changes,
  minSeverity: Severity
): void {
  let failed = false
  core.group('Vulnerabilities', async () => {
    if (addedChanges.length > 0) {
      for (const change of addedChanges) {
        printChangeVulnerabilities(change)
      }
      failed = true
    }

    if (failed) {
      core.setFailed('Dependency review detected vulnerable packages.')
    } else {
      core.info(
        `Dependency review did not detect any vulnerable packages with severity level "${minSeverity}" or higher.`
      )
    }
  })
}

function printChangeVulnerabilities(change: Change): void {
  for (const vuln of change.vulnerabilities) {
    core.info(
      `${styles.bold.open}${change.manifest} » ${change.name}@${
        change.version
      }${styles.bold.close} – ${vuln.advisory_summary} ${renderSeverity(
        vuln.severity
      )}`
    )
    core.info(`  ↪ ${vuln.advisory_url}`)
  }
}

function printLicensesBlock(
  invalidLicenseChanges: Record<string, Changes>
): void {
  core.group('Licenses', async () => {
    if (invalidLicenseChanges.forbidden.length > 0) {
      core.info('\nThe following dependencies have incompatible licenses:')
      printLicensesError(invalidLicenseChanges.forbidden)
      core.setFailed('Dependency review detected incompatible licenses.')
    }
    if (invalidLicenseChanges.unresolved.length > 0) {
      core.warning(
        '\nThe validity of the licenses of the dependencies below could not be determined. Ensure that they are valid SPDX licenses:'
      )
      printLicensesError(invalidLicenseChanges.unresolved)
      core.setFailed(
        'Dependency review could not detect the validity of all licenses.'
      )
    }
    printNullLicenses(invalidLicenseChanges.unlicensed)
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

function printDeniedDependencies(
  changes: Change[],
  config: ConfigurationOptions
): void {
  core.group('Denied', async () => {
    for (const denied of config.deny_packages) {
      core.info(`Config: ${denied}`)
    }

    for (const change of changes) {
      core.info(`Change: ${change.name}@${change.version} is denied`)
      core.info(`Change: ${change.package_url} is denied`)
    }
  })
}

run()
