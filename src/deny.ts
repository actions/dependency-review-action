import {Change} from './schemas'
import * as core from '@actions/core'

export async function getDeniedChanges(
  changes: Change[],
  deniedPackages: string[],
  deniedGroups: string[]
): Promise<Change[]> {
  const changesDenied: Change[] = []

  let failed = false
  for (const change of changes) {
    change.name = change.name.toLowerCase()
    const [name, version] = change.package_url.toLowerCase().split('@')

    if (deniedPackages) {
      for (const denied of deniedPackages) {
        const [dpName, dpVersion] = denied.toLowerCase().split('@')
        if (name === dpName && version !== dpVersion) {
          continue
        }
        if (name === dpName && version === dpVersion) {
          changesDenied.push(change)
          failed = true
        }
      }
    }

    if (deniedGroups) {
      for (const denied of deniedGroups) {
        if (name.startsWith(denied.toLowerCase())) {
          changesDenied.push(change)
          failed = true
        }
      }
    }
  }

  if (failed) {
    core.setFailed('Dependency review detected denied packages.')
  } else {
    core.info('Dependency review did not detect any denied packages')
  }

  return changesDenied
}
