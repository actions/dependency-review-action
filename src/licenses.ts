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
 * @returns {[Array<Change>, Array<Change]} A tuple where the first element is the list of denied changes and the second one is the list of changes with unknown licenses
 */
export function getDeniedLicenseChanges(
  changes: Change[],
  licenses: {
    allow?: string[]
    deny?: string[]
  }
): [Change[], Change[]] {
  const {allow, deny} = licenses

  const disallowed: Change[] = []
  const unknown: Change[] = []

  for (const change of changes) {
    const license = change.license
    if (license === null) {
      unknown.push(change)
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

  return [disallowed, unknown]
}
