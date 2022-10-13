import * as core from '@actions/core'
import * as dependencyGraph from './dependency-graph'
import * as github from '@actions/github'
import styles from 'ansi-styles'
import {RequestError} from '@octokit/request-error'
import {Change, Severity, Changes} from './schemas'
import {readConfig} from '../src/config'
import {
  filterChangesBySeverity,
  filterChangesByScopes,
  filterAllowedAdvisories
} from '../src/filter'
import {getDeniedLicenseChanges} from './licenses'
import * as summary from './summary'
import {getRefs} from './git-refs'

import {groupDependenciesByManifest} from './utils'

async function run(): Promise<void> {
  try {
    const config = readConfig()
    const refs = getRefs(config, github.context)

    const changes = await dependencyGraph.compare({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      baseRef: refs.base,
      headRef: refs.head
    })

    const minSeverity = config.fail_on_severity as Severity
    const scopedChanges = filterChangesByScopes(config.fail_on_scopes, changes)
    const filteredChanges = filterAllowedAdvisories(
      config.allow_ghsas,
      scopedChanges
    )

    const addedChanges = filterChangesBySeverity(
      minSeverity,
      filteredChanges
    ).filter(
      change =>
        change.change_type === 'added' &&
        change.vulnerabilities !== undefined &&
        change.vulnerabilities.length > 0
    )

    const [licenseErrors, unknownLicenses] = await getDeniedLicenseChanges(
      filteredChanges,
      {
        allow: config.allow_licenses,
        deny: config.deny_licenses
      }
    )

    summary.addSummaryToSummary(addedChanges, licenseErrors, unknownLicenses)
    summary.addChangeVulnerabilitiesToSummary(addedChanges, minSeverity)
    summary.addLicensesToSummary(licenseErrors, unknownLicenses, config)
    summary.addScannedDependencies(changes)

    printVulnerabilitiesBlock(addedChanges, minSeverity)
    printLicensesBlock(licenseErrors, unknownLicenses)
    printScannedDependencies(changes)
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
  } finally {
    await core.summary.write()
  }
}

function printVulnerabilitiesBlock(
  addedChanges: Change[],
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
  licenseErrors: Change[],
  unknownLicenses: Change[]
): void {
  core.group('Licenses', async () => {
    if (licenseErrors.length > 0) {
      printLicensesError(licenseErrors)
      core.setFailed('Dependency review detected incompatible licenses.')
    }
    printNullLicenses(unknownLicenses)
  })
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

run()
