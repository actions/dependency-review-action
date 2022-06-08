import {Change, ChangeSchema} from './schemas'

/**
 * Loops through a list of changes, filtering and returning the
 * ones that don't conform to the licenses allow/deny lists.
 * @param {Change[]} changes The list of changes to filter.
 * @param { { allow?: string[], deny?: string[]}} licenses An object with `allow`/`deny` keys, each containing a list of licenses.
 * @returns {Array<Change} The list of denied changes.
 */
export function getDeniedLicenseChanges(
  changes: Array<Change>,
  licenses: {
    allow?: Array<string>
    deny?: Array<string>
  }
): Array<Change> {
  let {allow = null, deny = null} = licenses

  let disallowed: Change[] = []

  for (const change of changes) {
    let license = change.license
    // TODO: be loud about unknown licenses
    if (license === null) {
      continue
    }
    if (allow !== null) {
      if (!allow.includes(license)) {
        disallowed.push(change)
      }
    } else if (deny !== null) {
      if (deny.includes(license)) {
        disallowed.push(change)
      }
    }
  }

  return disallowed
}
