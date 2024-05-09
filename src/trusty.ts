import {Change, Changes, ConfigurationOptions, TrustySummary} from './schemas'
import * as core from '@actions/core'
import { SummaryTableRow } from '@actions/core/lib/summary'

let failed_trusty = {status: 'failed'}

function trustyEcosystem(ecosystem: string): String {
  let ret = ecosystem
  if (ecosystem === 'pip') {
    ret = 'pypi'
  }
  return ret
}

function apiUrl(change: Change, endpoint: string){
  let base_api = endpoint || 'https://api.trustypkg.dev'
  let ecosystem = trustyEcosystem(change.ecosystem)
  const url = `${base_api}/v1/report?package_name=${change.name}&package_type=${ecosystem}`;
  return url;
}

function uiUrl(change: Change, endpoint: string){
  let base_api = endpoint || 'https://api.trustypkg.dev'
  let ecosystem = trustyEcosystem(change.ecosystem)
  const url = `${base_api}/${ecosystem}/${change.name}`;
  return url;
}

async function processChange(change: Change, config: ConfigurationOptions): Promise<Change> {
  const url = apiUrl(change, config.trusty_api);
  const response = await fetch(url);
  if (response.ok) {
    let trustyResponse = await response.json()
    change.trusty = { ...trustyResponse.summary,
      status: trustyResponse?.package_data.status,
      status_code: trustyResponse?.package_data.status_code
    } || failed_trusty
    if (change.trusty && trustyResponse['package_data']?.['status_code']) {
      change.trusty.status_code = trustyResponse['package_data']['status_code']
    }
  } else {
    core.debug(`Couldn't get trusty data for ${url}`)
    change.trusty = failed_trusty
  }
  return change;
}

export async function getTrustyScores(changes: Changes, config: ConfigurationOptions): Promise<Changes> {
  const results = Promise.all(changes.map(change => processChange(change, config)));
  return results
}

function descriptionAsTable(details: TrustySummary): string {
  let rows = Object.entries(details).map(([key, value]) => {
    return `<tr><td>${key}</td><td>${value}</td></tr>`
  })
  return `<details><table>${rows.join('')}</table></details>`
}

function nameAndLink(change: Change, endpoint: string): string {
  const url = uiUrl(change, endpoint);
  return `<a href="${url}">${change.name}</a>`
}

function changeAsRow(change: Change, config: ConfigurationOptions): SummaryTableRow {
  let row: SummaryTableRow = [
    nameAndLink(change, config.trusty_ui),
    change.trusty?.status || 'failed',
    change.trusty?.status_code?.toString() || '',
    change.trusty?.score?.toString() || '',
  ]
  if (change.trusty?.description !== undefined){
    row.push({data: descriptionAsTable(change.trusty.description)})
  }
  return row
}

function changesAsTable(changes: Changes, config: ConfigurationOptions): SummaryTableRow[] {
  let headings = ['Package', 'Status', 'Status Code', 'Score'].map(heading => ({
    data: heading,
    header: true
  }))
  let rows = changes.map(change => changeAsRow(change, config))
  if (rows.length > 0) {
    rows.unshift(headings)
  }
  return rows
}

export function addTrustyScores(changes: Changes, config: ConfigurationOptions): void {
  core.summary.addHeading('Trusty Scores', 2)
  core.summary.addTable(changesAsTable(changes, config))
}