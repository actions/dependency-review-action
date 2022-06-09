import {Change, ChangeSchema} from './schemas'

/**
 * Loops through a list of changes, filtering and returning the
 * ones that don't conform to the licenses allow/deny lists.
 *
 * Keep in mind that we don't let users specify both an allow and a deny
 * list in their config files, so this code works under the assumption that
 * one of the two list parameters will be empty. If both lists are provided,
 * we will ignore the deny list.
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
  let {allow, deny} = licenses

  let disallowed: Change[] = []

  for (const change of changes) {
    let license = change.license
    // TODO: be loud about unknown licenses
    if (license === null) {
      continue
    }
    if (allow !== undefined) {
      if (!allow.includes(license)) {
        disallowed.push(change)
      }
    } else if (deny !== undefined) {
      if (deny.includes(license)) {
        disallowed.push(change)
      }
    }
  }

  return disallowed
}
