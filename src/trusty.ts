import {Change, Changes, ConfigurationOptions, Trusty, TrustySummary} from './schemas'
import * as core from '@actions/core'
import { SummaryTableRow } from '@actions/core/lib/summary'
import { Type } from 'typescript'

let failed_trusty: Trusty = {status: 'failed'}

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

function processResponse(trustyResponse: { [x: string]: { [x: string]: any } }): Trusty {
  let trusty = { ...trustyResponse['summary'],
    status: trustyResponse?.['package_data']?.['status'],
    status_code: trustyResponse?.['package_data']?.['status_code']
  } || failed_trusty
  if (trusty && trustyResponse['package_data']?.['status_code']) {
    trusty.status_code = trustyResponse['package_data']['status_code']
  }
  return trusty;
}

async function fetchWithRetry(url: string, retries: number, changeName: string): Promise<Trusty> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      core.debug(`Fetching ${changeName} ${attempt}`);
      let response = await fetch(url);
      if (response.ok) {
        let trustyResponse = await response.json()
        let processed = processResponse(trustyResponse)
        if (processed.status === 'complete') {
          return processed;
        } else {
          core.warning(`Attempt ${changeName} ${attempt} failed: ${processed.status_code}`);
        }
      }
    } catch (error) {
      core.warning(`Attempt ${changeName} ${attempt} failed: ${error}`);
    }
    core.debug(`Waiting ${Math.pow(2, attempt)} seconds before retrying ${changeName}`);
    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
  }
  return failed_trusty;
}

async function processChange(change: Change, config: ConfigurationOptions): Promise<Change> {
  const url = apiUrl(change, config.trusty_api);
  change.trusty = await fetchWithRetry(url, config.trusty_retries, change.name);
  return change;
}

export async function getTrustyScores(changes: Changes, config: ConfigurationOptions): Promise<Changes> {
  const results = await Promise.all(changes.map(change => processChange(change, config)));
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
  let ct = {'added': '+', 'removed': '-'}
  let row: SummaryTableRow = [
    ct[change.change_type],
    nameAndLink(change, config.trusty_ui),
    change.version,
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
  let headings = ['+/-', 'Package', 'Version', 'Status', 'Status Code', 'Score'].map(heading => ({
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