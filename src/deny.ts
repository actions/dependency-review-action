import * as core from '@actions/core'
import {Change} from './schemas'
import {PackageURL, parsePURL} from './purl'

export async function getDeniedChanges(
  changes: Change[],
  deniedPackages: PackageURL[] = [],
  deniedGroups: PackageURL[] = []
): Promise<Change[]> {
  const changesDenied: Change[] = []

  for (const change of changes) {
    if (change.change_type === 'removed') {
      continue
    }

    for (const denied of deniedPackages) {
      if (
        (!denied.version || change.version === denied.version) &&
        change.name === denied.name
      ) {
        changesDenied.push(change)
      }
    }

    for (const denied of deniedGroups) {
      const namespace = getNamespace(change)
      if (!denied.namespace) {
        core.error(
          `Denied group represented by '${denied.original}' does not have a namespace. The format should be 'pkg:<type>/<namespace>/'.`
        )
      }
      if (namespace && namespace === denied.namespace) {
        changesDenied.push(change)
      }
    }
  }

  return changesDenied
}

export const getNamespace = (change: Change): string | null => {
  if (change.package_url) {
    return parsePURL(change.package_url).namespace
  }
  const matches = change.name.match(/([^:/]+)[:/]/)
  if (matches && matches.length > 1) {
    return matches[1]
  }
  return null
}
