import {Change, Changes, ConfigurationOptions, Trusty, TrustySummary} from './schemas'
import * as core from '@actions/core'
import { SummaryTableRow } from '@actions/core/lib/summary'

let failed_trusty: Trusty = {status: 'failed'}

const icons = {
  check: '✅',
  cross: '❌',
  warning: '⚠️',
  plus: '➕',
  minus: '➖'
};

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
  const name = encodeURIComponent(change.name);
  const url = `${base_api}/${ecosystem}/${name}`;
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

async function fetchWithRetry(change: Change, retries: number, config: ConfigurationOptions): Promise<Trusty> {
  let ret = failed_trusty
  const url = apiUrl(change, config.trusty_api);
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      core.debug(`Fetching ${change.name} ${attempt}`);
      let response = await fetch(url);
      let status: string =`${response.status} ${response.statusText}`;
      if (response.ok) {
        let trustyResponse = await response.json()
        let processed = processResponse(trustyResponse)
        if (processed.status === 'complete') {
          return processed;
        }
        status = '${processed.status_code} ${processed.status}';
      }
      core.warning(`Attempt ${change.name} ${attempt} failed: ${status}`);
      ret.status = response.statusText;
      ret.status_code = response.status;
    } catch (error) {
      core.warning(`Attempt ${change.name} ${attempt} failed: ${error}`);
    }
    core.debug(`Waiting ${Math.pow(2, attempt)} seconds before retrying ${change.name}`);
    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
  }
  return ret;
}

async function processChange(change: Change, config: ConfigurationOptions): Promise<Change> {
  change.trusty = await fetchWithRetry(change, config.trusty_retries, config);
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

function delta(change: Change, config: ConfigurationOptions): string{
  let ct = {'added': icons.plus, 'removed': icons.minus}
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

function changeAsRow(change: Change, config: ConfigurationOptions): SummaryTableRow {
  
  let row: SummaryTableRow = [
    delta(change, config),
    nameAndLink(change, config.trusty_ui),
    change.version,
    change.trusty?.score?.toString() || '',
  ]
  if (change.trusty?.description !== undefined){
    row.push({data: descriptionAsTable(change.trusty.description)})
  }
  if (change.trusty?.status !== 'complete'){
    let status = `${change.trusty?.status_code} ${change.trusty?.status}`
    row.push(status)
  }
  return row
}

function changesAsTable(changes: Changes, config: ConfigurationOptions): SummaryTableRow[] {
  let headings = ['+/-', 'Package', 'Version', 'Score'].map(heading => ({
    data: heading,
    header: true
  }))
  let rows = changes.map(change => changeAsRow(change, config))
  if (rows.length > 0) {
    rows.unshift(headings)
  }
  return rows
}

export function sortChangesByTrustyScore(changes: Changes): Changes {
  return changes.sort((a, b) => {
    const scoreA = a.trusty?.score || 0;
    const scoreB = b.trusty?.score || 0;
    return scoreA - scoreB; // For descending order, swap scoreA and scoreB for ascending order
  });
}

export function filterChangesByTrustyScore(changes: Changes, threshold: number): Changes {
  return changes.filter(change => (change.trusty?.score || 0) < threshold);
}

export function addTrustyScores(changes: Changes, config: ConfigurationOptions): void {
  const filteredChanges = filterChangesByTrustyScore(changes, config.trusty_show);
  const sortedChanges = sortChangesByTrustyScore(filteredChanges);
  core.summary.addHeading('Trusty Scores', 2)
  core.summary.addTable(changesAsTable(sortedChanges, config))
}