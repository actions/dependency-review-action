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
    const packageUrl = change.package_url.toLowerCase().split('@')[0]
    const packageVersion = change.package_url.toLowerCase().split('@')[1]

    // 1) Package URL has version but deny list doesn't
    // 2) Package URL has version and so does the deny list

    if (deniedPackages) {
      for (const denied of deniedPackages) {
        const deniedPackage = denied.split('@')
        if (
          deniedPackage.length < 2 &&
          packageUrl === deniedPackage[0].toLowerCase()
        ) {
          changesDenied.push(change)
          failed = true
        } else if (
          packageUrl === denied.split('@')[0].toLowerCase() &&
          packageVersion === denied.split('@')[1]
        ) {
          changesDenied.push(change)
          failed = true
        }
      }
    }

    if (deniedGroups) {
      for (const denied of deniedGroups) {
        if (packageUrl.startsWith(denied.toLowerCase())) {
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
