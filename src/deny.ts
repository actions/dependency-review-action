import * as core from '@actions/core'
import {Change} from './schemas'
import {PackageURL} from 'packageurl-js'
import {parsePURL} from './utils'

export async function getDeniedChanges(
  changes: Change[],
  deniedPackages: PackageURL[] = [],
  deniedGroups: PackageURL[] = []
): Promise<Change[]> {
  const changesDenied: Change[] = []

  let hasDeniedPackage = false
  for (const change of changes) {
    for (const denied of deniedPackages) {
      if (
        (!denied.version || change.version === denied.version) &&
        change.name === denied.name
      ) {
        changesDenied.push(change)
        hasDeniedPackage = true
      }
    }

    for (const denied of deniedGroups) {
      const namespace = getNamespace(change)
      if (namespace && namespace === denied.namespace) {
        changesDenied.push(change)
        hasDeniedPackage = true
      }
    }
  }

  if (hasDeniedPackage) {
    core.setFailed('Dependency review detected denied packages.')
  } else {
    core.info('Dependency review did not detect any denied packages')
  }

  return changesDenied
}

// getNamespace returns the namespace associated with the given change.
// it tries to get this from the package_url member, but that won't exist
// for all changes, so as a fallback it may create a new purl based on the
// ecosystem and name associated with the change, then extract the namespace
// from that.
// returns '' if there is no namespace.
export const getNamespace = (change: Change): string => {
  let purl_str: string
  if (change.package_url) {
    purl_str = change.package_url
  } else {
    purl_str = `pkg:${change.ecosystem}/${change.name}`
  }

  try {
    const purl = parsePURL(purl_str)
    const namespace = purl.namespace
    if (namespace === undefined || namespace === null) {
      return ''
    } else {
      return namespace
    }
  } catch (e) {
    core.error(`Error parsing purl '${purl_str}': ${e}`)
    return ''
  }
}
