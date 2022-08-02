import * as core from '@actions/core'
import * as dependencyGraph from './dependency-graph'
import * as checks from './checks'
import * as github from '@actions/github'
import styles from 'ansi-styles'
import {RequestError} from '@octokit/request-error'
import {
  Change,
  ConfigurationOptions,
  PullRequestSchema,
  Severity
} from './schemas'
import {readConfig} from '../src/config'
import {filterChangesBySeverity} from '../src/filter'
import {getDeniedLicenseChanges} from './licenses'

async function run(): Promise<void> {
  try {
    if (github.context.eventName !== 'pull_request') {
      throw new Error(
        `This run was triggered by the "${github.context.eventName}" event, which is unsupported. Please ensure you are using the "pull_request" event for this workflow.`
      )
    }

    const pull_request = PullRequestSchema.parse(
      github.context.payload.pull_request
    )

    const changes = await dependencyGraph.compare({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      baseRef: pull_request.base.sha,
      headRef: pull_request.head.sha
    })

    const config = readConfig()
    const minSeverity = config.fail_on_severity
    let failed = false

    const licenses = {
      allow: config.allow_licenses,
      deny: config.deny_licenses
    }

    const addedChanges = filterChangesBySeverity(
      minSeverity as Severity,
      changes
    ).filter(
      change =>
        change.change_type === 'added' &&
        change.vulnerabilities !== undefined &&
        change.vulnerabilities.length > 0
    )

    core.debug(`Found ${addedChanges.length} added changes`)

    for (const change of addedChanges) {
      printChangeVulnerabilities(change)
    }
    failed = addedChanges.length > 0

    core.debug(`creating check with ${failed ? 'failure' : 'success'}`)

    await checks.createVulnerabilitiesCheck(
      addedChanges,
      pull_request.head.sha,
      failed,
      minSeverity,
      config
    )

    const [licenseErrors, unknownLicenses] = getDeniedLicenseChanges(
      changes,
      licenses
    )

    if (licenseErrors.length > 0) {
      printLicensesError(licenseErrors)
      violationFound(
        config,
        'Dependency review detected incompatible licenses.'
      )
    }

    await checks.createLicensesCheck(
      licenseErrors,
      unknownLicenses,
      pull_request.head.sha,
      licenseErrors.length > 0,
      config
    )

    printNullLicenses(unknownLicenses)

    if (failed) {
      violationFound(config, 'Dependency review detected vulnerable packages.')
    } else {
      core.info(
        `Dependency review did not detect any vulnerable packages with severity level "${minSeverity}" or higher.`
      )
    }
  } catch (error) {
    if (error instanceof RequestError && error.status === 404) {
      core.setFailed(
        `Dependency review could not obtain dependency data for the specified owner, repository, or revision range.`
      )
    } else if (error instanceof RequestError && error.status === 403) {
      core.setFailed(
        `Dependency review is not supported on this repository. Please ensure that Dependency graph is enabled, see https://github.com/${github.context.repo.owner}/${github.context.repo.repo}/settings/security_analysis`
      )
    } else {
      if (error instanceof Error) {
        core.setFailed(error.message)
      } else {
        core.setFailed('Unexpected fatal error')
      }
    }
  }
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

function printLicensesError(changes: Change[]): void {
  if (changes.length === 0) {
    return
  }

  core.info('\nThe following dependencies have incompatible licenses:\n')
  for (const change of changes) {
    core.info(
      `${styles.bold.open}${change.manifest} » ${change.name}@${change.version}${styles.bold.close} – License: ${styles.color.red.open}${change.license}${styles.color.red.close}`
    )
  }
}

function printNullLicenses(changes: Change[]): void {
  if (changes.length === 0) {
    return
  }

  core.info('\nWe could not detect a license for the following dependencies:\n')
  for (const change of changes) {
    core.info(
      `${styles.bold.open}${change.manifest} » ${change.name}@${change.version}${styles.bold.close}`
    )
  }
}

function violationFound(config: ConfigurationOptions, message: string): void {
  if (config.fail_on_violation) {
    core.setFailed(message)
  } else {
    core.warning(message)
  }
}

run()
