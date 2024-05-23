// This code is used to fetch and process Trusty scores for a set of changes.
// It includes functions to fetch data with retry mechanism, process changes,
// sort and filter changes by Trusty score, and create a summary of changes.
import {
  Change,
  Changes,
  Update,
  Updates,
  ConfigurationOptions,
  Trusty,
  TrustySummary
} from './schemas'
import * as core from '@actions/core'
import {SummaryTableRow} from '@actions/core/lib/summary'
import Bluebird from 'bluebird'

// Default Trusty object for failed cases
const failed_trusty: Trusty = {status: 'failed'}

// Icons for summary table
const icons = {
  check: '✅',
  cross: '❌',
  warning: '⚠️',
  deprecated: '💀',
  archived: '📦',
  plus: '➕',
  minus: '➖'
}

function trustyEcosystem(ecosystem: string): string {
  const ecosystemMap: {[key: string]: string} = {
    pip: 'pypi',
    gomod: 'go'
  }
  return ecosystemMap[ecosystem] || ecosystem
}

function formatName(name: string): string {
  return encodeURIComponent(name.toLowerCase())
}

// Construct API URL
function apiUrl(change: Change, endpoint: string): string {
  const base_api = endpoint || 'https://api.trustypkg.dev'
  const ecosystem = trustyEcosystem(change.ecosystem)
  const name = formatName(change.name)
  const url = `${base_api}/v1/report?package_name=${name}&package_type=${ecosystem}`
  return url
}

// Construct UI URL
function uiUrl(change: Change, endpoint: string): string {
  const base_api = endpoint || 'https://api.trustypkg.dev'
  const ecosystem = trustyEcosystem(change.ecosystem)
  const name = formatName(change.name)
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
        | undefined,
      archived: trustyResponse?.['package_data']?.['archived'] as
        | boolean
        | undefined,
      deprecated: trustyResponse?.['package_data']?.['is_deprecated'] as
        | boolean
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
  const ret = {...failed_trusty}
  const url = apiUrl(change, config.trusty_api)
  const token = process.env.GITHUB_TOKEN
  let headers = {}
  if (token) {
    headers = {
      headers: {
        Authorization: `Bearer ${token}` // Add the Bearer token to the request headers
      }
    }
    core.debug(`Setting Authorization header for Trusty API`)
  } else {
    core.warning(`No GITHUB_TOKEN found. Trusty API may rate limit.`)
  }
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      core.debug(`Fetching ${change.name} ${attempt} from ${url}`)
      const response = await fetch(url, headers)
      let status = `${response.status} ${response.statusText}`
      if (response.ok) {
        const trustyResponse = await response.json()
        const processed = processResponse(trustyResponse)
        if (processed.status === 'complete') {
          return processed
        }
        if (processed.status === 'failed') {
          core.warning(`${change.name} failed on server. Not retrying.`)
          ret.status = processed.status || ''
          ret.status_code = processed.status_code || response.status || 0
          return ret
        }
        status = `${processed.status_code} ${processed.status}`
      }
      core.warning(`Attempt ${change.name} ${attempt} failed: ${status}`)
      ret.status = response.statusText
      ret.status_code = response.status
      if (response.status === 422) {
        return ret
      }
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
  const mapper = async (change: Change): Promise<Change> =>
    await processChange(change, config)
  const results = await Bluebird.Promise.map(changes, mapper, {concurrency: 10})
  return results
}

// Convert Trusty description to HTML table
function descriptionAsTable(details: TrustySummary): string {
  const rows = Object.entries(details).map(([key, value]) => {
    return `<tr><td>${key}</td><td>${value}</td></tr>`
  })
  return `<details><summary> </summary><table>${rows.join('')}</table></details>`
}

// Function to create an anchor for a change
function nameAndLink(change: Change, endpoint: string): string {
  const url = uiUrl(change, endpoint)
  return `<a href="${url}">${change.name}</a>`
}

// Function to determine the icon for a change
function scoreIcon(change: Change, config: ConfigurationOptions): string {
  let icon = icons.check
  const score = change?.trusty?.score || 0
  if (score <= config.trusty_warn) {
    icon = icons.warning
  }
  if (change?.trusty?.score !== undefined && score <= config.trusty_fail) {
    icon = icons.cross
  }
  return icon
}

// Function to determine the score text for a change
function scoreCell(change: Change, config: ConfigurationOptions): string {
  const icon = scoreIcon(change, config)
  const score = change.trusty?.score?.toString()
  return `${icon}&nbsp;${score}`
}

// Make it title case...
function toTitleCase(str: string): string {
  return str.replace(
    /\w\S*/g,
    txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  )
}

// Function to determine the warning text for a change
function warningCell(change: Change): string {
  const warnings = []
  if (change.trusty?.description?.malicious || false) {
    warnings.push(`${icons.cross}&nbsp;Malicious`)
  }
  if (change.trusty?.deprecated || false) {
    warnings.push(`${icons.deprecated}&nbsp;Deprecated`)
  }
  if (change.trusty?.archived || false) {
    warnings.push(`${icons.archived}&nbsp;Archived`)
  }
  return warnings.join(' ')
}

// Function to convert a change to a summary table row
function changeAsRow(
  change: Change,
  config: ConfigurationOptions
): SummaryTableRow {
  const row: SummaryTableRow = [
    toTitleCase(change.change_type),
    nameAndLink(change, config.trusty_ui),
    change.version,
    scoreCell(change, config),
    warningCell(change)
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

// Function to convert a change to a summary table row
function updateAsRow(
  change: Update,
  config: ConfigurationOptions
): SummaryTableRow[] {
  const ret = []
  if (change.added !== undefined) {
    ret.push(changeAsRow(change.added, config))
  }
  if (change.removed !== undefined) {
    ret.push(changeAsRow(change.removed, config))
  }
  if (ret.length > 1) {
    if (typeof ret[0][0] === 'string') {
      ret[0][0] = 'Updated'
    }
    ret[1][0] = ''
    ret[1][1] = ''
  }
  return ret
}

// Function to convert all changes to a summary table
function changesAsTable(
  updates: Updates,
  config: ConfigurationOptions
): SummaryTableRow[] {
  const headings = ['', 'Dependency', 'Version', 'Score', 'Warnings', ''].map(
    heading => ({
      data: heading,
      header: true
    })
  )
  const rows = updates.flatMap(update => updateAsRow(update, config))
  if (rows.length > 0) {
    rows.unshift(headings)
  }
  return rows
}

// Helper function to calculate the score
function getScore(change: Update): number {
  return change.added?.trusty?.score || change.removed?.trusty?.score || 0
}

// Helper function to check if the change is a removal
function isRemoval(change: Update): boolean {
  return change.added === undefined && change.removed !== undefined
}

// Function to sort changes by Trusty score
export function sortChangesByTrustyScore(changes: Updates): Updates {
  return changes.sort((a, b) => {
    const isARemoval = isRemoval(a)
    const isBRemoval = isRemoval(b)

    if (isARemoval !== isBRemoval) {
      // If one is a removal and the other is not, the removal should come last
      return isARemoval ? 1 : -1
    }

    // If both are removals or both are not, compare their scores
    const scoreA = getScore(a)
    const scoreB = getScore(b)
    return scoreA - scoreB
  })
}

// Filter changes by Trusty score
export function filterChangesByTrustyScore(
  updates: Updates,
  threshold: number
): Updates {
  return updates.filter(
    update =>
      ((update.added?.trusty?.score || 0) < threshold &&
        update.added?.trusty?.status_code !== 422) ||
      ((update.removed?.trusty?.score || 0) < threshold &&
        update.removed?.trusty?.status_code !== 422)
  )
}

// Merge changes into a single aggregated update
export function aggregateChanges(changes: Changes): Updates {
  const updates: {[key: string]: Update} = {}
  for (const change of changes) {
    const key = `${change.name}-${change.ecosystem}`
    if (!updates[key]) {
      updates[key] = {}
    }
    if (change.change_type === 'added') {
      updates[key].added = change
    }
    if (change.change_type === 'removed') {
      updates[key].removed = change
    }
  }
  return Object.values(updates)
}

// Create a summary of changes
function createSummary(changes: Updates, config: ConfigurationOptions): string {
  const summary = []
  const malicious = changes.filter(
    change =>
      change.added?.change_type === 'added' &&
      (change.added?.trusty?.description?.malicious || false)
  )
  const maliciousCount = malicious.length
  if (maliciousCount > 0) {
    summary.push(`${icons.cross} ${maliciousCount} malicious packages found.`)
  }

  const fails = changes.filter(
    change =>
      change.added?.change_type === 'added' &&
      undefined !== change.added?.trusty?.score &&
      change.added?.trusty?.score < config.trusty_fail
  )
  const failCount = fails.length
  if (failCount > 0) {
    summary.push(`${icons.cross} ${failCount} fails found.`)
  }

  const warns = changes.filter(
    change =>
      change.added?.change_type === 'added' &&
      (change.added?.trusty?.score || 0) < config.trusty_warn
  )
  const warnCount = warns.length
  if (warnCount > 0) {
    summary.push(`${icons.warning} ${warnCount} warnings found.`)
  }

  if (warnCount + failCount + maliciousCount > 0) {
    summary.push(`Expand to learn more.`)
  } else {
    summary.push('No changes require immediate attention.')
  }

  return summary.join(' ')
}

// Add Trusty scores to changes and create a summary
export function addTrustyScores(
  changes: Changes,
  config: ConfigurationOptions
): void {
  const updates = aggregateChanges(changes)
  const filteredChanges = filterChangesByTrustyScore(
    updates,
    config.trusty_show
  )
  const sortedChanges = sortChangesByTrustyScore(filteredChanges)
  core.summary.addHeading('Trusty Scores', 2)
  const summary = createSummary(sortedChanges, config)
  core.summary.addRaw(`<details><summary>${summary}</summary>`)
  core.summary.addRaw(
    `
    <div><br/>
    Trusty is a free service that helps developers evaluate the risk profile of open-source packages.
    Packages are rated 0 to 10 with higher ratings indicating safer packages.
    <a href='https://docs.stacklok.com/trusty/understand/scores-and-alternatives/'>Learn how</a>.
    </div>
    `
  )
  core.summary.addEOL()
  core.summary.addTable(changesAsTable(sortedChanges, config))
  core.summary.addRaw(`</details>`)
}
