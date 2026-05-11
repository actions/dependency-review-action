import {Change, Changes} from './schemas'
import {octokitClient} from './utils'
import {parsePURL, PackageURL, purlsMatch} from './purl'
import * as spdx from './spdx'

/**
 * Loops through a list of changes, filtering and returning the
 * ones that don't conform to the licenses allow/deny lists.
 * It will also filter out the changes which are defined in the licenseExclusions list.
 *
 * Keep in mind that we don't let users specify both an allow and a deny
 * list in their config files, so this code works under the assumption that
 * one of the two list parameters will be empty. If both lists are provided,
 * we will ignore the deny list.
 * @param {Change[]} changes The list of changes to filter.
 * @param { { allow?: string[], deny?: string[], licenseExclusions?: string[]}} licenses An object with `allow`/`deny`/`licenseExclusions` keys, each containing a list of licenses.
 * @returns {Promise<{Object.<string, Array.<Change>>}} A promise to a Record Object. The keys are strings, unlicensed, unresolved and forbidden. The values are a list of changes
 */
export type InvalidLicenseChangeTypes =
  | 'unlicensed'
  | 'unresolved'
  | 'forbidden'
export type InvalidLicenseChanges = Record<InvalidLicenseChangeTypes, Changes>
export async function getInvalidLicenseChanges(
  changes: Change[],
  licenses: {
    allow?: string[]
    deny?: string[]
    licenseExclusions?: string[]
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

  const licenseExclusions = licenses.licenseExclusions?.map(
    (pkgUrl: string) => {
      return parsePURL(pkgUrl)
    }
  )

  const groupedChanges = await groupChanges(changes, licenseExclusions)

  const licensedChanges: Changes = groupedChanges.licensed

  const invalidLicenseChanges: InvalidLicenseChanges = {
    unlicensed: groupedChanges.unlicensed,
    unresolved: [],
    forbidden: []
  }

  const validityCache = new Map<string, boolean>()

  for (const change of licensedChanges) {
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

async function groupChanges(
  changes: Changes,
  licenseExclusions: PackageURL[] | null = null
): Promise<Record<string, Changes>> {
  const result: Record<string, Changes> = {
    licensed: [],
    unlicensed: []
  }

  let candidateChanges = changes

  // If a package is excluded from license checking, we don't bother trying to
  // fetch the license for it and we leave it off of the `licensed` and
  // `unlicensed` lists.
  if (licenseExclusions !== null && licenseExclusions !== undefined) {
    candidateChanges = candidateChanges.filter(change => {
      if (change.package_url.length === 0) {
        return true
      }

      const changeAsPackageURL = parsePURL(change.package_url)

      // We want to find if the licenseExclusion list contains the PackageURL of the Change
      // If it does, we want to filter it out and therefore return false
      // If it doesn't, we want to keep it and therefore return true
      if (
        licenseExclusions.findIndex(exclusion =>
          purlsMatch(exclusion, changeAsPackageURL)
        ) !== -1
      ) {
        return false
      } else {
        return true
      }
    })
  }

  const ghChanges = []

  for (const change of candidateChanges) {
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
