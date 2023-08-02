import {Change} from './schemas'
import * as core from '@actions/core'

export async function getDeniedChanges(
  changes: Change[],
  deniedList: string[]
): Promise<Change[]> {
  const changesDenied: Change[] = []

  let failed = false
  for (const change of changes) {
    change.name = change.name.toLowerCase()
    change.package_url = change.package_url.toLowerCase()

    for (const denied of deniedList) {
      if (change.name.includes(denied)) {
        changesDenied.push(change)
        failed = true
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
