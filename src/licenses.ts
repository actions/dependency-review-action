import * as core from '@actions/core'
import {Octokit} from 'octokit'
import {Change} from './schemas'

/**
 * Loops through a list of changes, filtering and returning the
 * ones that don't conform to the licenses allow/deny lists.
 *
 * Keep in mind that we don't let users specify both an allow and a deny
 * list in their config files, so this code works under the assumption that
 * one of the two list parameters will be empty. If both lists are provided,
 * we will ignore the deny list.
 * @param {Change[]} changes The list of changes to filter.
 * @param { { allow?: string[], deny?: string[]}} licenses An object with `allow`/`deny` keys, each containing a list of licenses.
 * @returns {Promise<[Array.<Change>, Array.<Change>]>} A promise to a 2 element tuple. The first element is the list of denied changes and the second one is the list of changes with unknown licenses
 */
export async function getDeniedLicenseChanges(
  changes: Change[],
  licenses: {
    allow?: string[]
    deny?: string[]
  }
): Promise<[Change[], Change[]]> {
  const {allow, deny} = licenses

  const disallowed: Change[] = []
  const unknown: Change[] = []

  const consolidatedChanges = changes.some(
    ({source_repository_url, license}) => !license && source_repository_url
  )
    ? await setGHLicenses(changes)
    : changes

  for (const change of consolidatedChanges) {
    if (change.change_type === 'removed') {
      continue
    }

    const license = change.license
    if (license === null) {
      unknown.push(change)
      continue
    }
    if (allow !== undefined) {
      if (!allow.includes(license)) {
        disallowed.push(change)
      }
    } else if (deny !== undefined) {
      if (deny.includes(license)) {
        disallowed.push(change)
      }
    }
  }

  return [disallowed, unknown]
}

const fetchGHLicense = async (
  owner: string,
  repo: string
): Promise<string | null> => {
  const octokit = new Octokit({
    auth: core.getInput('repo-token', {required: true})
  })

  let response
  try {
    response = await octokit.request('GET /repos/{owner}/{repo}/license', {
      owner,
      repo
    })
  } catch (_) {
    return null
  }

  return response?.data?.license?.spdx_id ?? null
}

const setGHLicenses = async (changes: Change[]): Promise<Change[]> => {
  const updatedChanges = changes.map(async change => {
    const {source_repository_url, license} = change

    if (license || source_repository_url === null) {
      return change
    }

    const repoNwo = source_repository_url.split('github.com/')[1]
    const [owner, repo] = repoNwo.split('/')

    const retrievedLicense = await fetchGHLicense(owner, repo)

    return {
      ...change,
      license: retrievedLicense
    }
  })

  return await Promise.all(updatedChanges)
}
