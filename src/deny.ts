import * as core from '@actions/core'
import {Change} from './schemas'
import {PackageURL} from 'packageurl-js'

export async function getDeniedChanges(
  changes: Change[],
  deniedPackages: PackageURL[] = [],
  deniedGroups: PackageURL[] = []
): Promise<Change[]> {
  const changesDenied: Change[] = []

  let hasDeniedPackage = false
  for (const change of changes) {
    let changedPackage: PackageURL
    try {
      changedPackage = PackageURL.fromString(change.package_url)
    } catch (error) {
      core.error(`Error parsing package URL '${change.package_url}': ${error}`)
      continue
    }

    for (const denied of deniedPackages) {
      if (
        (!denied.version || changedPackage.version === denied.version) &&
        changedPackage.name === denied.name
      ) {
        changesDenied.push(change)
        hasDeniedPackage = true
      }
    }

    for (const denied of deniedGroups) {
      if (
        changedPackage.namespace &&
        changedPackage.namespace === denied.namespace
      ) {
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
