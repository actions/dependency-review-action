import {Change} from './schemas'
import * as core from '@actions/core'

export async function getDeniedChanges(
  changes: Change[],
  deniedPackages: string[],
  deniedGroups: string[]
): Promise<Change[]> {
  const changesDenied: Change[] = []

  let hasDeniedPackage = false
  for (const change of changes) {
    change.name = change.name.toLowerCase()
    const [name, version] = change.package_url.toLowerCase().split('@')

    for (const denied of deniedPackages) {
      const [deniedName, deniedVersion] = denied.toLowerCase().split('@')
      if (
        (!deniedVersion || version === deniedVersion) &&
        name === deniedName
      ) {
        changesDenied.push(change)
        hasDeniedPackage = true
      }
    }

    for (const denied of deniedGroups) {
      if (name.startsWith(denied.toLowerCase())) {
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
