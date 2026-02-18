import {Change, Changes} from './schemas'
import {octokitClient} from './utils'
import {parsePURL, PackageURL} from './purl'
import * as spdx from './spdx'

/**
 * Loops through a list of changes, filtering and returning the
 * ones that don't conform to the licenses allow/deny lists.
 * It will also filter out the changes which are defined in the allowedDependenciesLicenses list.
 *
 * Keep in mind that we don't let users specify both an allow and a deny
 * list in their config files, so this code works under the assumption that
 * one of the two list parameters will be empty. If both lists are provided,
 * we will ignore the deny list.
 * @param {Change[]} changes The list of changes to filter.
 * @param { { allow?: string[], deny?: string[], allowedDependenciesLicenses?: string[]}} licenses An object with `allow`/`deny`/`allowedDependenciesLicenses` keys, each containing a list of licenses.
 * @returns {Promise<{Object.<string, Array.<Change>>}} A promise to a Record Object. The keys are strings, unlicensed, unresolved and forbidden. The values are a list of changes
 */

export type InvalidLicenseChanges = {
  unlicensed: Changes
  unresolved: Changes
  forbidden: Changes
}
export type InvalidLicenseChangeTypes = keyof InvalidLicenseChanges

export async function getInvalidLicenseChanges(
  changes: Change[],
  licenses: {
    allow?: string[]
    deny?: string[]
    allowedDependenciesLicenses?: string[]
  }
): Promise<InvalidLicenseChanges> {
  const deny = licenses.deny
  let allow = licenses.allow

  // Filter out elements of the allow list that include AND
  // or OR because the list should be simple license IDs and
  // not expressions.
  allow = allow?.filter(license => {
    return !license.includes(' AND ') && !license.includes(' OR ')
  })

  const allowedDepLicenses = licenses.allowedDependenciesLicenses?.map(
    (pkgUrl: string) => {
      return parsePURL(pkgUrl)
    }
  )

  // Allow-list/Filter entries without a license are technically wildcards, so they apply
  // to any matching packages regardless of their license.
  // So we apply this filter before any operations that pull license information.
  const filtersWithNoLicenseQualifier = allowedDepLicenses?.filter(
    allowed => allowed.license == null
  )
  const preFilteredChanges = changes.filter(change =>
    filterLicenseChange(change, filtersWithNoLicenseQualifier)
  )

  // Group changes after initial filtering to ensure we don't pull unnecessary licenses from GH.
  const groupedChanges = await groupChanges(preFilteredChanges)

  // Secondary filter to apply allow-list entries with a license qualifier.
  // We have to do this after as the groupChanges function pulls license information from GH.
  const filtersWithLicenseQualifier = allowedDepLicenses?.filter(
    allowedDep => allowedDep.license != null
  )
  const filteredLicensedChanges = groupedChanges.licensed.filter(change =>
    filterLicenseChange(change, filtersWithLicenseQualifier)
  )

  const invalidLicenseChanges: InvalidLicenseChanges = {
    unlicensed: groupedChanges.unlicensed,
    unresolved: [],
    forbidden: []
  }

  const validityCache = new Map<string, boolean>()

  for (const change of filteredLicensedChanges) {
    const license = change.license

    // should never happen since licensedChanges always have licenses but license is nullable in changes schema
    if (license === null) {
      continue
    }

    if (license === 'NOASSERTION') {
      invalidLicenseChanges.unlicensed.push(change)
    } else if (validityCache.get(license) === undefined) {
      try {
        if (allow !== undefined) {
          if (spdx.isValid(license)) {
            const found = spdx.satisfies(license, allow)
            validityCache.set(license, found)
          } else {
            invalidLicenseChanges.unresolved.push(change)
          }
        } else if (deny !== undefined) {
          if (spdx.isValid(license)) {
            const found = spdx.satisfiesAny(license, deny)
            validityCache.set(license, !found)
          } else {
            invalidLicenseChanges.unresolved.push(change)
          }
        }
      } catch (err) {
        invalidLicenseChanges.unresolved.push(change)
      }
    }

    if (validityCache.get(license) === false) {
      invalidLicenseChanges.forbidden.push(change)
    }
  }

  return invalidLicenseChanges
}

/**
 * Filters out changes that are on the allowed dependencies licenses list.
 *
 * @param change The change to check if it should be filtered out or not.
 * @param allowedDependenciesLicenses The list of allowed dependencies licenses, represented as parsed package URLs.
 * @returns true if the change should be kept, false if it should be filtered out.
 */
const filterLicenseChange = (
  change: Change,
  allowedDependenciesLicenses?: PackageURL[]
): boolean => {
  if (
    change.package_url.length === 0 ||
    allowedDependenciesLicenses === undefined ||
    allowedDependenciesLicenses?.length === 0
  ) {
    return true
  }

  const changeAsPackageURL = parsePURL(change.package_url)

  for (const allowedDep of allowedDependenciesLicenses) {
    if (
      allowedDep.type !== changeAsPackageURL.type ||
      allowedDep.namespace !== changeAsPackageURL.namespace ||
      allowedDep.name !== changeAsPackageURL.name
    ) {
      continue
    }

    // Any license is allowed if the allow-list entry doesn't specify one
    if (allowedDep.license == null) {
      return false
    }

    // If no license specified, remove it from the list of changes
    // This maintains backwards compatibility
    if (change.license == null) {
      return false
    }

    if (allowedDep.license === change.license) {
      return false
    }
  }

  return true
}

const fetchGHLicense = async (
  owner: string,
  repo: string
): Promise<string | null> => {
  try {
    const response = await octokitClient().rest.licenses.getForRepo({
      owner,
      repo
    })
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
  license.length === 255 && !spdx.isValid(license)

type GroupedChanges = {
  licensed: Changes
  unlicensed: Changes
}

async function groupChanges(changes: Changes): Promise<GroupedChanges> {
  const result: GroupedChanges = {
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
