import * as core from '@actions/core'
import * as dependencyGraph from './dependency-graph'
import * as github from '@actions/github'
import styles from 'ansi-styles'
import {RequestError} from '@octokit/request-error'
import {PullRequestSchema} from './schemas'

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

    let failed = false
    let severity_to_fail = core.getInput('fail-on')

    let vuln_ranking_ordered = ['low', 'moderate', 'high', 'critical']
    if ( vuln_ranking_ordered.indexOf(severity_to_fail) === -1 ){
      throw new Error('Only the following values are accepted for the input fail-on: low, moderate, high, critical')
    }

    for (const change of changes) {
      if (
        change.change_type === 'added' &&
        change.vulnerabilities !== undefined &&
        change.vulnerabilities.length > 0
      ) {
        for (const vuln of change.vulnerabilities) {
          if (
            vuln_ranking_ordered.indexOf(vuln.severity) >= vuln_ranking_ordered.indexOf(severity_to_fail)
          ){
             failed = true
          }
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
    }

    if (failed) {
      throw new Error('Dependency review detected vulnerable packages.')
    } else {
      core.info('Dependency review did not detect any vulnerable packages of the severity: ' + severity_to_fail)
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

run()
