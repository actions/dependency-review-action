import * as core from '@actions/core'
import spdxSatisfies from 'spdx-satisfies'
import {Octokit} from 'octokit'

import {Change, Changes} from './schemas'
import {isSPDXValid} from './utils'

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

  const groupedChanges = await groupChanges(changes)
  const unlicensedChanges: Changes = groupedChanges.unlicensed
  const licensedChanges: Changes = groupedChanges.licensed

  const forbiddenLicenseChanges: Changes = []
  const validityCache = new Map<string, boolean>()

  for (const change of licensedChanges) {
    // should never happen since licensedChanges have licenses. Look into Intersection Types
    const license = change.license
    if (license === null) {
      continue
    }

    if (validityCache.get(license) === undefined) {
      if (allow !== undefined) {
        const found = allow.find(spdxExpression =>
          spdxSatisfies(license, spdxExpression)
        )
        validityCache.set(license, found !== undefined)
      } else if (deny !== undefined) {
        const found = deny.find(spdxExpression =>
          spdxSatisfies(license, spdxExpression)
        )
        validityCache.set(license, found === undefined)
      }
    }

    // TODO: Verify spdxSatisfies is working as expected as currently:
    // spdxSatisfies("MIT", "MIT AND (GPL-2.0 OR ISC)") => true
    // spdxSatisfies("MIT AND (GPL-2.0 OR ISC)", "MIT") => false

    if (validityCache.get(license) === false) {
      forbiddenLicenseChanges.push(change)
    }
  }

  return [forbiddenLicenseChanges, unlicensedChanges]
}

const fetchGHLicense = async (
  owner: string,
  repo: string
): Promise<string | null> => {
  const octokit = new Octokit({
    auth: core.getInput('repo-token', {required: true})
  })

  try {
    const response = await octokit.rest.licenses.getForRepo({owner, repo})
    return response.data.license?.spdx_id ?? null
  } catch (_) {
    return null
  }
}

const parseGitHubURL = (url: string): {owner: string; repo: string} | null => {
  try {
    const parsed = new URL(url)
    if (parsed.host !== 'github.com') {
      return null
    }
    const components = parsed.pathname.split('/')
    if (components.length < 3) {
      return null
    }
    return {owner: components[1], repo: components[2]}
  } catch (_) {
    return null
  }
}

const setGHLicenses = async (changes: Change[]): Promise<Change[]> => {
  const updatedChanges = changes.map(async change => {
    if (change.license !== null || change.source_repository_url === null) {
      return change
    }

    const githubUrl = parseGitHubURL(change.source_repository_url)

    if (githubUrl === null) {
      return change
    }

    return {
      ...change,
      license: await fetchGHLicense(githubUrl.owner, githubUrl.repo)
    }
  })

  return Promise.all(updatedChanges)
}
// Currently Dependency Graph licenses are truncated to 255 characters
// This possibly makes them invalid spdx ids
const truncatedDGLicense = (license: string): boolean =>
  license.length === 255 && !isSPDXValid(license)

async function groupChanges(
  changes: Changes
): Promise<Record<string, Changes>> {
  const result: Record<string, Changes> = {
    licensed: [],
    unlicensed: []
  }

  const ghChanges = []

  for (const change of changes) {
    if (change.change_type === 'removed') {
      continue
    }

    if (change.license === null) {
      if (change.source_repository_url !== null) {
        ghChanges.push(change)
      } else {
        result.unlicensed.push(change)
      }
    } else {
      if (
        truncatedDGLicense(change.license) &&
        change.source_repository_url !== null
      ) {
        ghChanges.push(change)
      } else {
        result.licensed.push(change)
      }
    }
  }

  if (ghChanges.length > 0) {
    const ghLicenses = await setGHLicenses(ghChanges)
    for (const change of ghLicenses) {
      if (change.license === null) {
        result.unlicensed.push(change)
      } else {
        result.licensed.push(change)
      }
    }
  }

  return result
}
