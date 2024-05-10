// This code is used to fetch and process Trusty scores for a set of changes.
// It includes functions to fetch data with retry mechanism, process changes,
// sort and filter changes by Trusty score, and create a summary of changes.
import {
  Change,
  Changes,
  ConfigurationOptions,
  Trusty,
  TrustySummary
} from './schemas'
import * as core from '@actions/core'
import {SummaryTableRow} from '@actions/core/lib/summary'

// Default Trusty object for failed cases
const failed_trusty: Trusty = {status: 'failed'}

// Icons for summary table
const icons = {
  check: '✅',
  cross: '❌',
  warning: '⚠️',
  plus: '➕',
  minus: '➖'
}

// Handle ecosystem naming differences
function trustyEcosystem(ecosystem: string): String {
  let ret = ecosystem
  if (ecosystem === 'pip') {
    ret = 'pypi'
  }
  return ret
}

// Construct API URL
function apiUrl(change: Change, endpoint: string): string {
  const base_api = endpoint || 'https://api.trustypkg.dev'
  const ecosystem = trustyEcosystem(change.ecosystem)
  const url = `${base_api}/v1/report?package_name=${change.name}&package_type=${ecosystem}`
  return url
}

// Construct UI URL
function uiUrl(change: Change, endpoint: string): string {
  const base_api = endpoint || 'https://api.trustypkg.dev'
  const ecosystem = trustyEcosystem(change.ecosystem)
  const name = encodeURIComponent(change.name)
  const url = `${base_api}/${ecosystem}/${name}`
  return url
}

interface TrustyResponse {
  [x: string]: {
    [x: string]: unknown
  }
}

// Process the response from Trusty API
function processResponse(trustyResponse: TrustyResponse): Trusty {
  const trusty =
    {
      ...trustyResponse['summary'],
      status: trustyResponse?.['package_data']?.['status'] as
        | string
        | undefined,
      status_code: trustyResponse?.['package_data']?.['status_code'] as
        | number
        | undefined
    } || failed_trusty
  if (trusty && trustyResponse['package_data']?.['status_code']) {
    trusty.status_code = trustyResponse['package_data']['status_code'] as number
  }
  return trusty
}

// Function to fetch Trusty data with retries
async function fetchWithRetry(
  change: Change,
  retries: number,
  config: ConfigurationOptions
): Promise<Trusty> {
  const ret = failed_trusty
  const url = apiUrl(change, config.trusty_api)
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      core.debug(`Fetching ${change.name} ${attempt}`)
      const response = await fetch(url)
      let status = `${response.status} ${response.statusText}`
      if (response.ok) {
        const trustyResponse = await response.json()
        const processed = processResponse(trustyResponse)
        if (processed.status === 'complete') {
          return processed
        }
        status = '${processed.status_code} ${processed.status}'
      }
      core.warning(`Attempt ${change.name} ${attempt} failed: ${status}`)
      ret.status = response.statusText
      ret.status_code = response.status
    } catch (error) {
      core.warning(`Attempt ${change.name} ${attempt} failed: ${error}`)
    }
    core.debug(
      `Waiting ${Math.pow(2, attempt)} seconds before retrying ${change.name}`
    )
    await new Promise(resolve =>
      setTimeout(resolve, Math.pow(2, attempt) * 1000)
    )
  }
  return ret
}

// Process a single change
async function processChange(
  change: Change,
  config: ConfigurationOptions
): Promise<Change> {
  change.trusty = await fetchWithRetry(change, config.trusty_retries, config)
  return change
}

// Function to get Trusty scores for all changes
export async function getTrustyScores(
  changes: Changes,
  config: ConfigurationOptions
): Promise<Changes> {
  const results = await Promise.all(
    changes.map(async change => await processChange(change, config))
  )
  return results
}

// Convert Trusty description to HTML table
function descriptionAsTable(details: TrustySummary): string {
  const rows = Object.entries(details).map(([key, value]) => {
    return `<tr><td>${key}</td><td>${value}</td></tr>`
  })
  return `<details><table>${rows.join('')}</table></details>`
}

// Function to create an anchor for a change
function nameAndLink(change: Change, endpoint: string): string {
  const url = uiUrl(change, endpoint)
  return `<a href="${url}">${change.name}</a>`
}

// Function to determine the delta icon for a change
function delta(change: Change, config: ConfigurationOptions): string {
  const ct = {added: icons.plus, removed: icons.minus}
  let icon = icons.check
  if (change.change_type === 'added' && change?.trusty?.score) {
    if (change?.trusty.score <= config.trusty_warn) {
      icon = icons.warning
    }
    if (change?.trusty.score <= config.trusty_fail) {
      icon = icons.cross
    }
  }
  return `${ct[change.change_type]}${icon}`
}

// Function to convert a change to a summary table row
function changeAsRow(
  change: Change,
  config: ConfigurationOptions
): SummaryTableRow {
  const row: SummaryTableRow = [
    delta(change, config),
    nameAndLink(change, config.trusty_ui),
    change.version,
    change.trusty?.score?.toString() || ''
  ]
  if (change.trusty?.description !== undefined) {
    row.push({data: descriptionAsTable(change.trusty.description)})
  }
  if (change.trusty?.status !== 'complete') {
    const status = `${change.trusty?.status_code} ${change.trusty?.status}`
    row.push(status)
  }
  return row
}

// Function to convert all changes to a summary table
function changesAsTable(
  changes: Changes,
  config: ConfigurationOptions
): SummaryTableRow[] {
  const headings = ['+/-', 'Package', 'Version', 'Score'].map(heading => ({
    data: heading,
    header: true
  }))
  const rows = changes.map(change => changeAsRow(change, config))
  if (rows.length > 0) {
    rows.unshift(headings)
  }
  return rows
}

// Function to sort changes by Trusty score
export function sortChangesByTrustyScore(changes: Changes): Changes {
  return changes.sort((a, b) => {
    const scoreA = a.trusty?.score || 0
    const scoreB = b.trusty?.score || 0
    return scoreA - scoreB // For descending order, swap scoreA and scoreB for ascending order
  })
}

// Filter changes by Trusty score
export function filterChangesByTrustyScore(
  changes: Changes,
  threshold: number
): Changes {
  return changes.filter(change => (change.trusty?.score || 0) < threshold)
}

// Create a summary of changes
function createSummary(changes: Changes, config: ConfigurationOptions): string {
  const showCount = changes.filter(
    change =>
      ((change.change_type === 'added' && change.trusty?.score) || 0) <
      config.trusty_show
  ).length
  const failCount = changes.filter(
    change =>
      ((change.change_type === 'added' && change.trusty?.score) || 0) <
      config.trusty_fail
  ).length
  const warnCount = changes.filter(
    change =>
      ((change.change_type === 'added' && change.trusty?.score) || 0) <
      config.trusty_warn
  ).length

  let ret =
    `There are ${showCount} additions with a score below ${config.trusty_show}, ` +
    `${warnCount} additions with a score below ${config.trusty_warn}, and ` +
    `${failCount} additions with a score below ${config.trusty_fail}.`
  if (failCount > 0) {
    ret += ` Please review the changes carefully.`
    core.setFailed(ret)
  } else if (warnCount > 0) {
    ret += ` You might want to review the warnings.`
  } else {
    ret += ` No changes require immediate attention.`
  }
  return ret
}

// Add Trusty scores to changes and create a summary
export function addTrustyScores(
  changes: Changes,
  config: ConfigurationOptions
): void {
  const filteredChanges = filterChangesByTrustyScore(
    changes,
    config.trusty_show
  )
  const sortedChanges = sortChangesByTrustyScore(filteredChanges)
  core.summary.addHeading('Trusty Scores', 2)
  core.summary.addRaw(`<a>${createSummary(sortedChanges, config)}</a>`)
  core.summary.addEOL()
  core.summary.addTable(changesAsTable(sortedChanges, config))
}
