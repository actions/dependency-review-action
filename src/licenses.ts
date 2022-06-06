import {Change, ChangeSchema} from './schemas'

export function hasInvalidLicenses(
  changes: Array<Change>,
  allowLicenses: Array<string> | undefined,
  failLicenses: Array<string> | undefined
): Array<Change> {
  let disallowed: Change[] = []

  if (allowLicenses === undefined) {
    allowLicenses = []
  }
  if (failLicenses === undefined) {
    failLicenses = []
  }

  for (const change of changes) {
    let license = change.license
    // TODO: be loud about unknown licenses
    if (license === null) {
      continue
    }
    if (allowLicenses.length > 0) {
      if (!allowLicenses.includes(license)) {
        disallowed.push(change)
      }
    } else if (failLicenses.length > 0) {
      if (failLicenses.includes(license)) {
        disallowed.push(change)
      }
    }
  }

  return disallowed
}
